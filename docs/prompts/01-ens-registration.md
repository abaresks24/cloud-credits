# J1 — Enregistrement ENSv2 beta (reverse-engineering de l'interface)

> Traçabilité IA (SPEC §5.5). Point de contrôle J1 « un nom se résout » : ATTEINT.

## Résultat
`cloudcredits.eth` enregistré sur ENSv2 Sepolia beta, owner = wallet dev, resolver = PublicResolverV2.
Vérifié : `ethRegistry.getResolver("cloudcredits")` → `0xe7B9…11f7` (PublicResolverV2) ⇒ le nom résout.
Tx register : `0x32967b957580a571e5c9f6e1b73394256a828c44ccc413bd74591a17551ee9ce`.

## Comment (l'interface beta n'est PAS documentée — découverte on-chain, SPEC §4.3)
1. Les sélecteurs v1 (`available`, `rentPrice`, `makeCommitment` v1) **ne matchent pas**. Extraction
   des vrais sélecteurs depuis le bytecode : `cast selectors "$(cast code <reg>)" --resolve`.
2. Le registrar price **en ERC-20, pas en ETH** : `getRegisterPrice(label,duration,paymentToken)` a
   reverté `PaymentTokenNotSupported(address)` avec address(0). L'oracle `rentPriceOracle`
   (`0x8914…8987`) expose `isPaymentToken(address)`. Tokens acceptés : Circle USDC (faucet-gated) et
   **MockUSDC `0x768f…7a39` (mint libre, 6 décimales)** + MockDAI. Prix `cloudcredits` 1 an = 8.000021 USDC.
3. Ordre exact des params confirmé depuis la source `ensdomains/namechain`
   (`contracts/src/registrar/interfaces/IETHRegistrar.sol`), pas d'un tuto :
   - `makeCommitment(label, owner, secret, subregistry, resolver, duration, referrer)` (pure)
   - `register(label, owner, secret, subregistry, resolver, duration, paymentToken, referrer)`
4. Flux commit-reveal : `commit(commitment)` → attendre `MIN_COMMITMENT_AGE` (60 s, max 24 h) →
   `approve` MockUSDC au registrar → `register(...)`. Constantes lues on-chain : MIN_COMMITMENT_AGE=60,
   MAX=86400, MIN_REGISTER_DURATION=GRACE_PERIOD=28 j. Script : `script/register-ens.sh`.

## Paramètres retenus (J1)
subregistry = address(0) (pas encore de sous-registre pour les sous-noms), resolver = PublicResolverV2,
duration = 1 an, referrer = 0. Le sous-registre (pour émettre `<label>.cloudcredits.eth`) et l'écriture
des records `commitment.*` sont pour J2 (attention : la beta a historiquement refusé setText sur le
resolver partagé — à retester, sinon resolver maison).

## Points ouverts pour J2
- Comment attacher un subregistry à `cloudcredits.eth` pour émettre des sous-noms (rôle EAC).
- Écrire/lire `commitment.status/provider/verified/expires` (setText ou resolver dédié).

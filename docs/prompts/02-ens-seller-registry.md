# J2 — EnsSellerRegistry lit commitment.status on-chain

> Traçabilité IA. Point de contrôle J2 « un test lit commitment.status » : ATTEINT (6/6 tests).

## Décision forcée par la beta
`setText` sur le resolver partagé ENSv2 beta (PublicResolverV2) **revert sans données** pour un nom
fraîchement enregistré (traversée d'autorisation cassée — gap connu de la beta, vérifié on-chain le
2026-09-06). On ne peut donc pas écrire `commitment.*` sur le resolver partagé.

**Parade (identique à l'expérience passée) :** notre propre resolver `CommitmentResolver`
(text-resolver ENSIP standard). Le nom ENS réel continue de résoudre vers CE resolver via le registre
ENS (`setResolver`), donc la résolution reste ENS-native. On y implémente aussi la **séparation de
rôles EAC** (SPEC §5.2) : `issuer` onboard (provider/verified/expires + status active), `verifier`
délégué ne peut que **changer commitment.status** (active/suspended/revoked) — jamais bouger/supprimer
le nom ni toucher les autres records. C'est ça qui fait d'ENS un choix de conception, pas un décor.

## Contrats
- `src/CommitmentResolver.sol` — text-resolver ENSIP (`text(bytes32,string)`, supportsInterface
  0x59d1d43c), rôles issuer/verifier, `onboard` / `setStatus`, events.
- `src/EnsSellerRegistry.sol` — adaptateur lecture : `isEligibleSeller(node)` = `status == "active"`
  (jamais l'expiration du nom, SPEC §5.2), `commitmentOf(node)` pour l'écran « why refused ».
  **Fail-closed** (try/catch → not eligible).

## Tests (test/EnsSellerRegistry.t.sol) — 6/6
onboard→éligible + lecture des records ; **verifier revoke → éligibilité tombe** (démo §6 étape 8) ;
suspended → inéligible ; stranger ne peut ni setStatus ni onboard ; node inconnu → inéligible.

## Reste ENS (plus tard)
- Déployer CommitmentResolver sur Sepolia + `setResolver` de cloudcredits.eth dessus + records live.
- Émettre des sous-noms vendeurs `<label>.cloudcredits.eth` (subregistry) pour un scénario complet.

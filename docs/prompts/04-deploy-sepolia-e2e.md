# J4 — Déploiement Sepolia + achat conforme e2e (trip-wire J4)

> Traçabilité IA. Point de contrôle J4 « squelette complet fonctionnel » : ATTEINT on-chain.

## Résultat
Tout le protocole déployé sur Sepolia via `script/Deploy.s.sol`, et **un achat conforme exécuté dans
le même broadcast** ("ONCHAIN EXECUTION COMPLETE & SUCCESSFUL"). Adresses : `docs/DEPLOYMENTS.md`.
Vérifié on-chain : `adapter.isEligible(dev)=true` (éligibilité ENS live via cloudcredits.eth),
`hook.allowedRouter(router)=true`, `factor=9999`, solde ACME du dev = 51000.10 (mint − seed + achat).

## Le pont ENS → hook
`src/EnsEligibilityAdapter.sol` (IEligibility) : détient le pointeur léger `address → ENS node`
(seul mapping local ; tous les attributs restent dans ENS, lus en direct via `EnsSellerRegistry`) et
répond `isEligible(user) = registry.isEligibleSeller(nodeOf[user])`. 4 tests. Le hook consomme cet
adaptateur en prod ; en test on injecte un mock.

## Deux pièges de déploiement résolus
1. **Hook déployé via CREATE2 → owner = proxy CREATE2, pas nous** → `setRouter` revert `NotOwner`.
   Correctif : `owner` passé en argument de constructeur (= le déployeur), pas `msg.sender`.
2. **Simulation sans clé** : le sender du broadcast ≠ `me` → `NotOwner` en simulation. Correctif :
   `vm.startBroadcast(pk)` avec la clé, sender = owner. (Broadcast réel : `--broadcast --slow`.)

## Détails techniques
- Hook miné avec `HookMiner.find(CREATE2_DEPLOYER, flags, creationCode, args)` → adresse à bits de
  permission `0x888` (`0x3364…8888`), déployé en CREATE2 `{salt}`.
- Pool `CommitmentToken/MockUSDC` (fee 3000, tickSpacing 60), `initialize(key, SQRT_PRICE_1_1)`.
- Réserves seedées (50k ACME + 200k USDC) en claims 6909 ; achat 1000 USDC → ~1000.1 ACME (factor 9999).
- MockUSDC réutilisé comme USDC-test du pool (mint libre).

**Suite complète : 24 tests verts** (6 EnsSellerRegistry + 4 EnsEligibilityAdapter + 7 TimeDecay + 7 TimeDecayHook).

## Reste
J5 : rejouer la décote dans le temps on-chain (avance de 21 mois — en test/fork via warp, sur Sepolia
on montre via 2 achats à des dates différentes ou un fork) + démo révocation (verifier flip status →
achat via un vendeur révoqué échoue). J6 : Selfie Check + front. J7 : livrables + vidéo.

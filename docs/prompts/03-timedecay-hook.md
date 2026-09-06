# J3 — TimeDecayHook (le cœur) + RISQUE #1

> Traçabilité IA. Points de contrôle J3 : **test routeur bloquant PASSANT** + **décision chemin A/B**.

## Décision : CHEMIN A (custom curve) — retenu, fonctionnel
Le hook applique sa propre courbe de prix dans `beforeSwap` (renvoie un `BeforeSwapDelta` qui no-op la
liquidité concentrée), à la place d'un simple dynamic fee (chemin B). Raison : un *fee* dégrade
l'exécution dans les deux sens et ne peut pas exprimer qu'un actif est **moins cher** près de
l'échéance (un acheteur veut *plus* de jetons par USDC quand ça décote — un fee en donnerait moins).
Seule la custom curve modélise correctement la décote directionnelle. Chemin A est vert → on garde A.

## RISQUE #1 (identité appelant vs routeur) — traité + prouvé
v4 passe au hook le *caller* (le routeur), pas l'utilisateur. Parade en deux temps :
1. **Routeur dédié** `CommitmentRouter` : met `hookData = abi.encode(msg.sender)` depuis SON appelant
   (non falsifiable par un tiers). 
2. Le hook n'accepte que les routeurs **allow-listés** (`allowedRouter[sender]`) et lit l'utilisateur
   réel dans `hookData`, jamais `sender`.
**Test bloquant obligatoire PASSANT** : `test_RISK1_ineligibleUser_viaEligibleRouter_reverts` — même
routeur allow-listé, utilisateur non éligible → `NotEligible` (assertion précise au niveau hook + e2e).
`test_unauthorizedRouter_reverts` : un routeur non allow-listé → `UnauthorizedRouter`, même pour un
utilisateur éligible.

## Accounting v4 (piège résolu)
Première version : `take(input)`/`settle(output)` en ERC-20 → **revert `ERC20InsufficientBalance`** :
le PoolManager ne détient pas de réserves (la liquidité concentrée est désactivée, les réserves sont
dans le hook). Correctif = motif **CSMM ERC-6909** : les réserves du hook sont des *claims* 6909 ;
`beforeSwap` fait `take(input,…,true)` (mint 6909) + `settle(output,…,true)` (burn 6909) ;
`seedLiquidity` dépose les ERC-20 du LP via `manager.unlock` et mint les claims au hook. Le LP est
gaté par éligibilité (RISK #1 s'applique aussi aux LP ; ici le LP est `msg.sender` direct).

## Prix
1 CommitmentToken = `factor` USDC, `factor = TimeDecay.factorBips(timeToExpiry, horizon)/1e4`.
`test_decay_sameUsdcBuysMoreNearExpiry` : on avance le temps de 640 j → le même montant d'USDC achète
strictement **plus** de jetons (moins chers) — le prix change **mécaniquement** (SPEC §6 étapes 5-6).
`factor==0` (expiré) → `TradingClosed`.

## Contrats & tests
`src/TimeDecayHook.sol`, `src/CommitmentRouter.sol`, `src/IEligibility.sol` (+ `src/TimeDecay.sol`).
`test/TimeDecayHook.t.sol` : **7 tests** (harnais v4 Deployers, hook déployé à une adresse-flags via
deployCodeTo, pool initialisé, réserves seedées). **Suite complète : 20 tests / 20.**

## Reste
Adaptateur `IEligibility` adossé à `EnsSellerRegistry` (address→node→status) pour brancher l'ENS réel
sur le gate du hook. Puis J4 (pool + achat conforme e2e sur Sepolia), J5 (démo décote+révocation), etc.

# Collateral — SellerBond (trust-minimization, "Niveau 1")

> Traçabilité IA. Réponse à l'objection « il reste de la confiance » : on ajoute une caution.

## Idée
Le desk qui atteste et l'officier qui révoque = confiance réputationnelle. On ne peut pas la supprimer
totalement (l'actif est une créance réelle sur AWS — on ne peut être plus trustless que la partie qui
*doit* la chose : c'est le "last-mile / oracle problem" des RWA). Mais on peut la **réduire par une
garantie économique** : le vendeur poste une **caution**, slashée en cas de fraude pour indemniser
l'acheteur on-chain. Si la caution ≥ montant payé, l'acheteur est **couvert quoi qu'il arrive**.

## Contrat `src/SellerBond.sol`
- `deposit` / `hasBond(seller)` (≥ minBond) ; `requestUnbond` + cooldown → `withdraw` ; `slash(seller)`
  (onlyArbiter → verse la caution au `beneficiary` = pool d'indemnisation).
- `deposit` annule un unbond en cours ; l'arbitre peut slasher **pendant** le cooldown (un fraudeur ne
  peut pas s'échapper en demandant un retrait).

## Branchement
`TimeDecayHook.seedLiquidity` (l'action *vendeur* = fournir l'engagement) exige désormais **ENS actif
ET caution** (`NotBonded` sinon). Les acheteurs ne cautionnent pas. Le hook prend `_bond` en
constructeur (address(0) = désactivé, pour garder les tests RISK #1 purs).

## Démo (s'emboîte sur la révocation §6.8)
L'officier **révoque le statut ENS** *et* **slash la caution** → l'acheteur est indemnisé (pool
financé), le vendeur perd sa mise, sans qu'aucun nom ne bouge. « Révoquer » a maintenant des **dents**.

## Frontière honnête
La caution ne supprime pas le **déclencheur** (qui déclare la fraude). Elle remplace la confiance
réputationnelle par une garantie économique + un remède automatique. Pour pousser plus loin : jeu de
challenge / arbitrage décentralisé (hors budget hackathon).

## Tests
`test/SellerBond.t.sol` (6) : deposit/min, cooldown+withdraw, deposit annule unbond, slash onlyArbiter
→ pool, slash pendant cooldown. `test/DemoScenarios.t.sol` : +2 (caution requise pour lister, slash
indemnise). **Suite : 36 tests verts.** Redéployé sur Sepolia (nouvelles adresses, docs/DEPLOYMENTS.md).

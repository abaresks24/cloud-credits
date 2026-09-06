# J1 — Kickoff & décisions initiales

> Traçabilité IA (SPEC §5.5). Décisions prises avant la première ligne de contrat.

## Contexte
Pivot depuis un projet précédent (Curber, supprimé). Nouveau projet : **marché secondaire
d'engagements cloud**. Brief = `docs/SPEC.md`. Deadline dim 13/09/2026 18:00 Paris, soumettre sam 12.

## Décisions
- **Stack** : Foundry (contrats) + Next.js/viem (front, plus tard). Chaîne unique **Sepolia 11155111**.
- **Nom de travail** : `cloud-credits`. Branding éventuel plus tard.
- **Ordre de bataille** : on attaque le RISQUE #1 (identité appelant vs routeur) dès le hook (J3),
  avec le test d'acceptation bloquant. On ne merge rien sans le test « non-éligible via routeur
  éligible → revert ».
- **Hook** : viser chemin A (custom curve `beforeSwap` + `BeforeSwapDelta`). Décision A/B au **J3**.
- **ENSv2** : éligibilité = `commitment.status`, **jamais** l'expiration du nom (grâce 28j +
  renouvelable par n'importe qui). EAC pour le rôle « vérification ».

## À faire J1 (SPEC §7)
1. Épingler les adresses officielles v4 (Sepolia) + ENSv2 (Sepolia beta) dans `addresses.ts` daté,
   vérifiées on-chain (`cast code`). **Ne jamais inventer.**
2. Env, ETH Sepolia, créer un sous-nom à la main → vérifier qu'il se résout.
3. Sourcer des chiffres publics vérifiables sur le gaspillage d'engagements cloud (Flexera / CNCF /
   ProsperOps). Sources citées dans le README, rien d'inventé.

## Utilisation de l'IA
Développement assisté par Claude Code. Décisions d'architecture et arbitrages validés par l'humain
(règle d'acceptation §4.6). Log des prompts/décisions dans ce dossier.

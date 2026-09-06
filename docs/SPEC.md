# SPEC — Marché secondaire des engagements cloud

> Document de conception et de direction du projet. Rédigé avant toute ligne de code.
> Sert de brief à Claude Code et d'artefact de planification pour la soumission ETHGlobal.

---

## 1. Contexte et budget réel

**Deadline : dimanche 13 septembre 2026, 12:00 EDT (18:00 Paris).**
Nous sommes le 6 septembre. Il reste **7 jours**, développeur solo, ~4-5h/jour.
Budget utile : ~30h, dont ~8h de livrables de soumission. **~22h de construction.**

Ce budget est la contrainte dominante du projet. Chaque décision de conception est arbitrée par lui.

| Sponsor | Track | Dotation |
|---|---|---|
| Uniswap Foundation | Best Uniswap Stack Contribution | 3 000 $ / 3 places |
| ENS | Best Use of ENSv2 | 4 500 $ / 4 places |
| World | Selfie Check | 3 500 $ |

Jugement **asynchrone**. Les sponsors ne voient que le dépôt, la vidéo (2-4 min) et les champs
d'explication du formulaire. Aucune présentation orale.

## 2. Le problème

Les entreprises signent des engagements de dépense pluriannuels avec les fournisseurs cloud
(AWS, GCP, Azure) en échange de remises importantes. Puis les besoins changent : un projet est
annulé, une équipe migre, une prévision était trop optimiste. L'entreprise paie alors pour de la
capacité qu'elle n'utilisera jamais.

Il n'existe pas de marché liquide où revendre cet engagement à une entreprise qui, elle, en a besoin.

> **À faire jour 1 :** trouver et citer des chiffres publics sur le gaspillage d'engagements cloud
> (rapports Flexera, CNCF, ProsperOps ou équivalents). Ne rien inventer : le README doit citer des
> sources vérifiables.

## 3. Ce qu'on construit

Un marché secondaire où un engagement cloud non consommé se revend avec décote.

**Le cœur technique : un engagement n'a pas une valeur constante.** Un crédit de 100 000 $ valable
encore deux ans vaut plus que le même crédit à trois mois de son expiration, parce que l'acheteur a
moins de temps pour le consommer. La valeur converge vers zéro à l'échéance si le crédit est perdu
à cette date.

Un AMM classique ne sait pas modéliser ça : il traite tous les jetons d'un pool comme identiques et
interchangeables. C'est précisément ce qu'un hook Uniswap v4 permet de corriger — et c'est ce qui
rend le hook **nécessaire** plutôt que décoratif.

## 4. Contraintes non négociables

1. **Une seule chaîne : Sepolia (11155111).** Uniswap v4 et ENSv2 y sont tous deux déployés
   (vérifié le 6/09/2026). Aucun pont, aucun cross-chain.
2. **Ne jamais inventer une adresse de contrat.** v4 →
   `developers.uniswap.org/docs/protocols/v4/deployments`. ENSv2 →
   `docs.ens.domains/learn/deployments`, section Sepolia beta. Épingler dans un `addresses.ts`
   unique avec la date de récupération.
3. **ENSv2 est en bêta, interfaces non figées.** Vérifier chaque signature on-chain plutôt que de
   se fier à un tutoriel.
4. **Commits petits, fréquents, rédigés par l'humain.** Un historique en trois gros commits est un
   motif de disqualification ETHGlobal.
5. **Traçabilité IA obligatoire.** Prompts et décisions de conception dans `/docs/prompts/`. Une
   section `## Utilisation de l'IA` dans le README, rédigée honnêtement.
6. **Règle d'acceptation humaine.** Aucun fichier mergé si je ne peux pas énoncer à voix haute ce
   qu'il fait et pourquoi.

## 5. Architecture

### 5.1 `CommitmentToken.sol`
Représente un engagement cloud tokenisé. ERC-20 par échéance (un token = un couple fournisseur +
date d'expiration). Volontairement pas d'ERC-1155 multi-échéance : hors budget.
Attributs immuables au déploiement : `provider`, `faceValue`, `expiry`.

### 5.2 `EnsSellerRegistry.sol`
Adaptateur de lecture vers ENSv2. Un vendeur validé possède un sous-nom `<label>.<domaine>.eth`
dont le Permissioned Resolver porte :
- `commitment.status` → `active` | `suspended` | `revoked`
- `commitment.provider` → `aws` | `gcp` | `azure`
- `commitment.verified` → preuve que l'engagement existe
- `commitment.expires` → timestamp

**Piège ENSv2 à traiter explicitement :** la période de grâce est de 28 jours et un nom expiré peut
être renouvelé **par n'importe qui**. L'expiration d'un nom ne peut donc pas servir de mécanisme de
révocation. L'éligibilité dépend de `commitment.status`, jamais de la seule expiration ENS.

**Enhanced Access Control** délègue à un rôle « vérification » le droit de modifier
`commitment.status` sans pouvoir transférer ni révoquer le nom. C'est ce point qui fait d'ENSv2 un
choix de conception et non un décor.

### 5.3 `TimeDecayHook.sol` — le cœur du projet

Hook v4 attaché au pool `CommitmentToken / USDC-test`.

**Objectif :** le prix pratiqué par le pool intègre le temps restant avant expiration. Plus
l'échéance approche, plus la décote appliquée est forte, et le prix converge vers la valeur
résiduelle attendue.

**Implémentation visée (chemin A) :** courbe personnalisée via `beforeSwap` retournant un
`BeforeSwapDelta`, le hook absorbant le montant du swap et appliquant sa propre formule de prix.
C'est le motif « custom curve » de v4.

**Repli (chemin B), si le chemin A n'est pas fonctionnel au soir du jour 3 :** frais dynamiques
indexés sur le temps restant, via le flag de dynamic fee. Beaucoup plus simple, argument plus
faible mais honnête. **Décision à prendre au jour 3, pas au jour 6.**

Autres callbacks :
- `beforeAddLiquidity` / `beforeRemoveLiquidity` — vérifient l'éligibilité du LP

> **RISQUE TECHNIQUE PRINCIPAL — à traiter avant tout le reste.**
> Uniswap v4 transmet au hook l'adresse de l'**appelant**, qui est en pratique le routeur, pas
> l'utilisateur final. Une implémentation naïve vérifie donc l'identité du routeur et ne contrôle
> **rien**, tout en compilant, se déployant et passant les tests.
>
> Solutions admises : faire transiter l'identité via `hookData`, ou écrire un routeur dédié minimal.
>
> **Critère d'acceptation obligatoire :** un test prouvant qu'un swap initié par un utilisateur NON
> éligible échoue, alors qu'il passe par un routeur éligible. Sans ce test, le hook est réputé faux.

### 5.4 Onboarding vendeur — Selfie Check
Un engagement cloud est vendu par une entreprise, mais c'est une **personne** qui autorise la
cession. Selfie Check prouve qu'un humain réel, non un script, est derrière la mise en vente.
Signal anti-fraude, pas KYC.
Test via le **World ID Sandbox** (utilisateurs fictifs, aucune biométrie réelle). Preuve validée →
attribution du sous-nom ENS et écriture des enregistrements.

### 5.5 Frontend
Trois écrans. Mise en vente (Selfie Check → sous-nom → mint du token). Marché (achat, avec
affichage du prix et de la décote appliquée). Et une **courbe de valeur dans le temps** montrant la
convergence vers l'échéance — c'est l'écran qui vend le projet.

## 6. Le parcours à démontrer

1. Acme mise en vente : Selfie Check → `acme.<domaine>.eth` avec ses attributs
2. Mint d'un engagement : 100 000 $ AWS, expiration dans 24 mois
3. Un LP vérifié crée le pool et dépose de la liquidité
4. Un acheteur vérifié achète → **le prix reflète la décote temporelle**
5. On avance le temps de 21 mois (manipulation du timestamp en test)
6. Même achat → **le prix a changé mécaniquement**, sans intervention humaine
7. Un acheteur non vérifié tente d'acheter → **rejet**, avec la raison lue depuis ENS
8. Le rôle vérification passe `commitment.status` à `revoked` → la revente échoue, sans qu'aucun nom
   n'ait été transféré ni supprimé

Les étapes 5-6 démontrent le hook. L'étape 8 démontre ENSv2.

## 7. Découpage — 7 jours

| Jour | Objectif | Point de contrôle bloquant |
|---|---|---|
| J1 (dim 6) | Adresses épinglées, env, ETH Sepolia, sous-nom créé à la main, chiffres du marché sourcés | Un sous-nom se résout |
| J2 | `EnsSellerRegistry` lit un enregistrement on-chain | Un test lit `commitment.status` |
| J3 | `CommitmentToken` + hook, `beforeSwap` seul | **Test routeur passant + décision chemin A ou B** |
| J4 | Pool créé, achat conforme de bout en bout | **Squelette complet fonctionnel** |
| J5 | Décote temporelle démontrable + révocation via EAC | Étapes 5-6 et 8 rejouables |
| J6 | Onboarding Selfie Check + frontend | Démo cliquable |
| J7 (sam 12) | Livrables, vidéo, soumission | **Soumis samedi soir, pas dimanche** |

**Trip wire J4 :** si l'achat conforme ne passe pas de bout en bout au soir du J4, on abandonne
Selfie Check et on soumet sur deux sponsors (Uniswap + ENS) avec attribution manuelle des sous-noms.

**Soumettre le samedi.** La deadline est dimanche 18h Paris, mais l'upload vidéo rejette
automatiquement (résolution, durée) et il faut du temps pour corriger.

## 8. Hors périmètre — ne pas construire

- ERC-1155 multi-échéance, plusieurs fournisseurs simultanés
- Oracle de prix, indice de marché
- Vérification cryptographique de l'existence réelle de l'engagement
- Multi-chaîne, agents, x402
- Accès depuis l'interface publique Uniswap : le pool passe par le routeur dédié. **Assumer et expliquer.**

## 9. Livrables de soumission

- **Vidéo 2-4 min**, ≥720p, voix humaine, pas de téléphone, pas de synthèse vocale, pas de
  musique+texte en remplacement de la narration. Motifs de rejet automatique.
- **`FEEDBACK.md`** + formulaire `developers.uniswap.org/hackathon-feedback` avec le lien vers ce fichier.
- **Document de retour World** : doc Selfie Check, Developer Portal, états et erreurs du Sandbox. →
  notes prises **au fil de l'eau dès le J1**.
- **`README.md`** pointant les contrats et lignes de code à vérifier, la section IA, et les sources du §2.
- **Démo en ligne** en plus de la vidéo (demandé par ENS).

## 10. Objections attendues — à traiter dans le README

- **« Ces engagements sont-ils juridiquement cessibles ? »** Réponse honnête : les contrats cloud
  restreignent la cession, un déploiement réel supposerait un accord des fournisseurs. Ne pas masquer
  cette limite — l'assumer et la présenter comme la condition d'industrialisation.
- **« Pourquoi un hook plutôt qu'un pool classique ? »** Sans décote temporelle, le marché mal-price
  systématiquement : deux engagements de même valeur faciale mais d'échéances différentes
  s'échangeraient au même prix.
- **« Pourquoi ENS plutôt qu'un `mapping(address => bool)` ? »** Expiration native, délégation par
  rôle via EAC, attributs riches, et identité **portable** réutilisable par d'autres protocoles sans
  permission.
- **« ENSv2 est-il central ou cosmétique ? »** Pointer le scénario de révocation (§6, étape 8).

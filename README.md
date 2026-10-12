# NOVA — Thème Shopify Online Store 2.0

Thème e-commerce **minimaliste, premium et futuriste** (noir / blanc / gris + bleu électrique), conçu pour la boutique NOVA, centrée sur les **accessoires pour animaux** (chiens, chats, promenade, couchage, jouets, hygiène). Le thème reste générique : d'autres univers (lifestyle, gadgets…) peuvent être ajoutés à tout moment en créant de nouvelles collections.

- 100 % Liquid + CSS + JavaScript natif (Web Components), **aucune dépendance externe**
- Compatible **Online Store 2.0** : templates JSON, sections partout, groupes de sections (en-tête / pied de page), blocs d'applications (`@app`)
- Entièrement personnalisable depuis l'**éditeur de thème Shopify**
- Validé avec **Shopify Theme Check** (0 erreur, 0 avertissement)

---

## 1. Structure du thème

```
nova/
├── assets/
│   ├── base.css                 # Design system complet (variables, composants, animations)
│   ├── global.js                # Header, méga-menu, tiroirs, variantes, galerie, filtres, compte à rebours…
│   ├── cart-drawer.js           # Panier interactif (tiroir + page panier) via l'API AJAX
│   └── predictive-search.js     # Recherche instantanée (/search/suggest)
├── config/
│   ├── settings_schema.json     # Paramètres du thème (couleurs, polices, panier, animations…)
│   └── settings_data.json       # Valeurs par défaut
├── layout/
│   ├── theme.liquid             # Gabarit principal
│   └── password.liquid          # Page « Bientôt disponible »
├── locales/
│   ├── fr.default.json          # Français (langue par défaut)
│   └── en.json                  # Anglais
├── sections/
│   ├── header-group.json        # Groupe en-tête : barre d'annonces + header
│   ├── footer-group.json        # Groupe pied de page
│   ├── announcement-bar.liquid  # Messages en rotation ou défilement continu
│   ├── header.liquid            # Logo, méga-menu, recherche, compte, panier, menu mobile
│   ├── footer.liquid            # Menus, newsletter, réseaux, pays/langue, paiements
│   ├── hero-slideshow.liquid    # Bannière / diaporama (image, image mobile ou vidéo)
│   ├── features.liquid          # Avantages / réassurance
│   ├── collection-list.liquid   # Catégories (cartes ou pastilles)
│   ├── featured-collection.liquid
│   ├── promo-banner.liquid      # Offre promo + code copiable + compte à rebours
│   ├── marquee.liquid           # Bandeau défilant
│   ├── image-with-text.liquid
│   ├── rich-text.liquid
│   ├── faq.liquid
│   ├── newsletter.liquid
│   ├── apps.liquid              # Section libre pour blocs d'applications
│   ├── main-product.liquid      # Fiche produit (galerie, variantes, guide des tailles, achat…)
│   ├── product-reviews.liquid   # Avis clients (données réelles via appli d'avis)
│   ├── product-recommendations.liquid
│   ├── main-collection.liquid   # Collection + filtres + tri + pagination
│   ├── main-list-collections.liquid
│   ├── main-cart.liquid
│   ├── main-search.liquid
│   ├── predictive-search.liquid # (technique) résultats de recherche instantanée
│   ├── cart-drawer.liquid       # (technique) rafraîchissement du tiroir panier
│   ├── cart-icon-bubble.liquid  # (technique) pastille du panier
│   ├── main-page / main-404 / main-blog / main-article / main-password / contact-form
├── snippets/
│   ├── product-card.liquid      # Carte produit (2ᵉ image au survol, badges, ajout rapide, pastilles)
│   ├── price.liquid, rating.liquid, icon.liquid, facets.liquid, pagination.liquid
│   ├── cart-drawer.liquid, cart-line-items.liquid, free-shipping.liquid
│   └── css-variables.liquid, meta-tags.liquid, social-icons.liquid, address-fields.liquid
└── templates/
    ├── index.json, product.json, collection.json, list-collections.json
    ├── cart.json, search.json, page.json, page.contact.json
    ├── blog.json, article.json, 404.json, password.json, gift_card.liquid
    └── customers/ (login, register, account, order, addresses, activate_account, reset_password)
```

## 2. Fonctionnalités

| Demande | Où |
|---|---|
| Page d'accueil complète + bannière promo | `templates/index.json` : diaporama, avantages, catégories, best-sellers, offre + compte à rebours, bandeau, nouveautés, histoire de marque, FAQ, newsletter |
| Menu et catégories | `header.liquid` : méga-menu sur 2 niveaux, visuel promo optionnel, menu mobile en tiroir |
| Pages collections | `main-collection.liquid` : filtres (colonne ou tiroir), tri, filtres actifs, pagination, sans rechargement |
| Fiches produits | `main-product.liquid` : galerie (vidéos, 3D, zoom plein écran), variantes avec pastilles couleur et valeurs indisponibles barrées, **guide des tailles** en fenêtre, stock, paiement express, onglets, barre d'achat collante |
| Panier interactif | Tiroir latéral : modification des quantités, barre de livraison gratuite, remises, suggestions si le panier est vide |
| Barre de recherche | Recherche prédictive (produits, catégories, pages, suggestions), navigation au clavier, raccourci `/` |
| Avis clients | Notes et avis **réels uniquement** (voir §5) |
| Produits recommandés | API de recommandations Shopify (similaires ou complémentaires) |
| Offres promotionnelles | Section « Offre promotionnelle », barre d'annonces, badges -% automatiques sur les produits soldés |
| Animations | Apparition au défilement, zoom au survol, halos bleus, défilement fluide ; désactivées si le visiteur a demandé à réduire les animations |
| Responsive | Mobile d'abord : carrousels tactiles, tiroirs, barre d'achat collante |

## 3. Installer et tester le thème **sans publier la boutique**

> ⚠️ Votre boutique actuelle n'a pas été modifiée. Les méthodes ci-dessous ajoutent le thème NOVA **en brouillon** dans la bibliothèque de thèmes. Votre thème en ligne reste celui que voient vos clients tant que vous ne cliquez pas sur **Publier**.

### Option A — Import d'un fichier ZIP (le plus simple)

1. Téléchargez ce dépôt en ZIP depuis GitHub (bouton **Code → Download ZIP**), ou créez l'archive vous-même :
   ```bash
   zip -r nova-theme.zip assets config layout locales sections snippets templates
   ```
   Les dossiers `assets/`, `config/`… doivent se trouver **à la racine** du ZIP. Si GitHub les place dans un sous-dossier `nova-…/`, décompressez puis recompressez le contenu de ce sous-dossier.
2. Dans l'administration Shopify : **Boutique en ligne → Thèmes → Ajouter un thème → Importer un fichier ZIP**.
3. Le thème apparaît dans la **Bibliothèque de thèmes** (non publié).
4. Cliquez sur **… → Aperçu** pour le tester, ou sur **Personnaliser** pour l'éditer.
5. Pour le montrer à quelqu'un : **… → Partager l'aperçu** (lien valable 14 jours).

### Option B — Shopify CLI (recommandé pour développer)

```bash
npm install -g @shopify/cli@latest
cd nova
shopify theme dev --store votre-boutique.myshopify.com
```
- `theme dev` crée un **thème de développement** caché et ouvre un aperçu local (`http://127.0.0.1:9292`) avec rechargement automatique. Rien n'est publié.
- Pour envoyer le thème en brouillon dans la bibliothèque :
  ```bash
  shopify theme push --unpublished --store votre-boutique.myshopify.com
  ```
- Pour vérifier le code : `shopify theme check`

### Option C — Synchronisation GitHub

**Boutique en ligne → Thèmes → Ajouter un thème → Connecter depuis GitHub**, puis choisissez le dépôt `nova` et la branche. Le thème est ajouté non publié et se met à jour à chaque push.

### Boutique entièrement nouvelle ?

Si vous préférez une boutique séparée (recommandé pour « repartir de zéro ») : créez un nouveau compte Shopify, ou une **boutique de développement** gratuite via le [Shopify Partners Dashboard](https://partners.shopify.com/), puis importez le thème avec l'option A ou B. Votre boutique actuelle n'est alors jamais touchée.

## 4. Configuration après l'import

1. **Menus** (Boutique en ligne → Navigation)
   - `main-menu` : par ex. *Chiens* (sous-menus : Colliers & harnais, Laisses, Couchage, Jouets, Gamelles), *Chats* (Arbres à chat, Jouets, Couchage, Hygiène), *Promenade*, *Offres*.
   - `footer` : Contact, FAQ, Livraison, Retours, CGV, Mentions légales.
2. **Collections** : *Chiens, Chats, Promenade, Couchage, Jouets, Hygiène, Nouveautés, Best-sellers, Offres*. Pour une collection « Offres » automatique, utilisez la condition *Prix comparé > 0*.
3. **Éditeur de thème** (Personnaliser) :
   - Paramètres du thème : logo, logo clair (pour fond sombre), couleurs, polices, seuil de livraison gratuite, réseaux sociaux.
   - Accueil : associez chaque bloc « Catégorie » à sa collection, choisissez les collections des sections produits et ajoutez vos images de bannière (2400 × 1200 px).
   - Offre promotionnelle : créez d'abord le code dans **Remises**, puis renseignez-le avec sa date de fin (`2026-11-30 23:59`).
4. **Guide des tailles** : créez une page « Guide des tailles » (tableau tour de cou / poitrail / poids), puis sélectionnez-la dans *Fiche produit → Sélecteur de variantes → Page Guide des tailles*.
5. **Filtres** : installez l'application gratuite **Shopify Search & Discovery** et activez les filtres *Disponibilité, Prix, Type de produit, Taille, Couleur*. Ajoutez aussi un filtre *Animal* via un métachamp produit ou une étiquette.
6. **Badge « Nouveau »** : ajoutez l'étiquette `nouveau` à un produit.
7. Les textes de réassurance (livraison, retours) sont **à adapter à vos conditions réelles**.

## 5. Avis clients (aucun faux avis)

Le thème **n'affiche aucun avis inventé**, et aucune donnée d'avis n'est écrite en dur.

- La note (étoiles + nombre d'avis) sur les cartes et les fiches produits provient des métachamps standards `reviews.rating` et `reviews.rating_count`, remplis automatiquement par les applications d'avis (Judge.me, Shopify Product Reviews, Loox, Okendo, Yotpo…). **Sans avis, rien ne s'affiche.**
- Pour afficher les avis et leur formulaire : installez une application d'avis, puis dans l'éditeur ouvrez **Fiche produit → section « Avis clients » → Ajouter un bloc** et choisissez le bloc de l'application.
- La plupart des applications permettent d'importer les **avis vérifiés** de vos fournisseurs ou de solliciter vos clients après achat. N'importez que des avis réels et vérifiables.

## 6. Intégration CJdropshipping

Le thème affiche les produits Shopify standards ; il n'y a donc rien de spécifique à coder. Il suffit de connecter CJ à la boutique.

1. Installez l'application **CJdropshipping** depuis l'App Store Shopify et connectez votre compte CJ.
2. Dans CJ, recherchez vos produits pour animaux, puis utilisez **List / Push to Shopify**. Les produits sont créés dans Shopify avec leurs photos, leur description et leurs variantes (taille, couleur).
3. Avant de publier chaque produit :
   - **Titre et description** : réécrivez-les en français, de façon claire. Utilisez des titres HTML `<h3>` et des listes : le thème les met en forme automatiquement.
   - **Options** : nommez-les `Taille` et `Couleur` (pas `Size` / `Color` en double). Le thème affiche alors des pastilles pour la couleur et le lien « Guide des tailles » pour la taille.
   - **Images** : utilisez un fond uni et le même format pour toutes (carré recommandé). Associez une image à chaque variante de couleur : la galerie changera d'image au changement de variante.
   - **Prix** : renseignez un *prix comparé* uniquement s'il correspond à un ancien prix réel (le badge -% est calculé automatiquement).
   - **Collections** : ajoutez le produit à la bonne collection (*Chiens*, *Chats*…).
4. **Délais** : indiquez les délais réels de CJ dans le bloc « Livraison / garanties » et sur votre page Livraison.
5. **Stocks** : activez la synchronisation des stocks dans CJ. Le thème affiche « Épuisé » et « Plus que X articles » à partir des stocks Shopify.

## 7. Personnalisation avancée

- Toutes les couleurs passent par des variables CSS (`snippets/css-variables.liquid`), modifiables depuis l'éditeur.
- Les traductions se trouvent dans `locales/` et sont modifiables aussi dans **Boutique en ligne → Thèmes → … → Modifier le contenu par défaut**.
- Pour ajouter une icône : ajoutez un cas dans `snippets/icon.liquid`.

## 8. Checklist avant publication

- [ ] Logo, favicon et images de bannière ajoutés
- [ ] Menus `main-menu` et `footer` créés
- [ ] Collections créées et associées aux sections
- [ ] Pages légales (CGV, mentions légales, confidentialité, retours, livraison) remplies dans **Paramètres → Politiques**
- [ ] Application d'avis installée et bloc ajouté
- [ ] Search & Discovery configurée (filtres)
- [ ] Commande test passée (**Paramètres → Paiements → mode test**)
- [ ] Aperçu vérifié sur mobile
- [ ] Ensuite seulement : **Publier**

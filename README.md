# Pokédex TCG

Suivez votre collection de cartes Pokémon dans un Pokédex personnel, simple et pensé mobile d'abord.

**Démo : [pokedex-nkr.vercel.app](https://pokedex-nkr.vercel.app)**

<p align="center">
  <img src="docs/preview-mobile.webp" alt="Aperçu mobile du Pokédex TCG" width="320">
</p>

## Fonctionnalités

- Recherche dans le catalogue FR, EN et JP (noms localisés) et ajout en un geste
- Recherche par code imprimé, ex. `125/103`, dans les trois langues
- Prix Cardmarket en euros, actualisation par carte ou pour toute la collection
- Scans officiels, ou photo personnelle compressée directement dans l'app
- Code de série, numéro, rareté, type, état, langue et quantité
- Valeur totale, prix d'achat, investissement et plus-value
- Historique local de la valeur de la collection, avec courbe dans les statistiques
- Statistiques par série et par état
- Favoris, filtres par série, recherche locale et tri
- Export / import JSON pour sauvegarder ou changer d'appareil
- Ajout à l'écran d'accueil (manifest, icônes), thème clair/sombre automatique

## Stack

- [Next.js 16](https://nextjs.org) (App Router) + React 19
- [Tailwind CSS 4](https://tailwindcss.com)
- [lucide-react](https://lucide.dev)
- [TCGdex API](https://tcgdex.dev) pour les cartes FR, EN et JP, les scans et les prix Cardmarket
- Images de secours TCGplayer pour les cartes sans scan TCGdex

## Démarrage

```bash
npm install
npm run dev
```

Ouvrir [http://localhost:3000](http://localhost:3000).

```bash
npm run build   # build de production
npm run lint    # ESLint
```

## Données et prix

Votre collection et son historique de valeur sont stockés **uniquement dans le `localStorage` de votre navigateur**.
Aucun compte, aucune base de données, aucun envoi de vos données.

- Les prix proviennent de Cardmarket via TCGdex et restent indicatifs.
- Les scans japonais sont souvent absents : vous pouvez ajouter votre photo depuis la fiche de la carte.
- Ils sont actualisés manuellement depuis le menu « Réglages ».
- Pensez à exporter une sauvegarde JSON avant de vider votre navigateur ou de changer d'appareil.

## Déploiement

Le projet est hébergé sur Vercel et chaque push sur `main` redéploie la production.

```bash
npx vercel --prod
```

## Crédits

Données et visuels de cartes : [TCGdex](https://tcgdex.dev), TCGplayer et Cardmarket.
Projet non officiel, non affilié à Nintendo, Creatures Inc. ou The Pokémon Company.

# Déployer la présentation ALCO One sur Coolify

L'image sert la présentation v8 sur `https://alco-one.com/`, avec `robots.txt`, `sitemap.xml` et l'image de
partage `og.png`. Les sources et les versions 6 et 7 ne sont pas exposées. Il n'y a ni base de données, ni
variable d'environnement, ni volume.

## Prérequis

- La branche à déployer est sur GitHub, avec `Dockerfile`, `.dockerignore`, `deploy/coolify/` et `v8/index.html`.
- `alco-one.com` et `www.alco-one.com` pointent vers le serveur Coolify (enregistrements DNS A).
- Coolify peut lire le dépôt : dépôt public, ou GitHub App ou clé de déploiement si le dépôt est privé.

## Créer l'application

1. Dans le projet Coolify : **Add New Resource**, puis **Public Repository** ou **Private Repository**.
2. Renseigner le dépôt `https://github.com/Justinobin/alco-one-presentation` et la branche à déployer.
3. Build pack : **Dockerfile**. Base directory : `/`. Dockerfile : `/Dockerfile`.
4. Ports Exposes : `8080`.
5. Domains : `https://alco-one.com,https://www.alco-one.com`. Coolify obtient les certificats TLS.
6. Health check : activé, chemin `/healthz`, port `8080`.
7. Lancer **Deploy**.

## Vérifier

```sh
curl -I https://alco-one.com/
curl https://alco-one.com/healthz
curl -I https://alco-one.com/sources/v8/README.md
curl -I https://www.alco-one.com/
curl https://alco-one.com/robots.txt
```

Résultats attendus : `200` avec les en-têtes de sécurité, puis `ok`, puis `404`, puis une redirection `301`
vers `https://alco-one.com/`, puis le contenu de `robots.txt`.

Dans un navigateur, l'ouverture vidéo doit se jouer, les écrans doivent défiler et la console ne doit
signaler aucun blocage de sécurité (Content-Security-Policy).

## Référencement

1. Déclarer `alco-one.com` dans Google Search Console et Bing Webmaster Tools, puis soumettre `sitemap.xml`.
2. Tester la page avec le test des résultats enrichis de Google et le débogueur de partage de LinkedIn.
3. Mettre à jour `lastmod` dans `public/sitemap.xml` à chaque changement important du contenu.

## Mettre à jour

Reconstruire la page depuis `sources/v8/` avec `node construire.mjs`, committer `v8/index.html`, pousser,
puis lancer **Redeploy**, ou activer le déploiement automatique sur la branche.

## Revenir en arrière

Dans **Deployments**, relancer le déploiement précédent.

## Activer l'envoi direct du formulaire

1. Renseigner `ENVOI_URL` dans `sources/v8/src/app.js`, puis reconstruire la page.
2. Si le service est sur un autre domaine, l'ajouter à `connect-src` dans `deploy/coolify/nginx.conf`.
3. Autoriser le domaine de la présentation dans la configuration CORS de ce service.

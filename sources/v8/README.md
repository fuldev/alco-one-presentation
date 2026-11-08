# Présentation ALCO One, version 8

Dix écrans, un seul à la fois, qui s'ajustent à la fenêtre sans défilement, sur ordinateur comme sur
téléphone. Sous 860 px de large, les écrans passent en composition verticale, au doigt ou avec les boutons.

## Construire

```sh
node construire.mjs
```

Écrit `../../v8/index.html`, un seul fichier qui contient ses styles, son script, ses polices et ses
médias. Node 18 ou plus, sans installation. Un chemin en argument écrit ailleurs, pour un essai.

## Voir en local

```sh
python -m http.server 8000
```

Puis ouvrir http://localhost:8000/v8/ depuis la racine du dépôt.

## Fichiers

| Fichier | Contenu |
|---|---|
| `src/index.html` | Les écrans et leurs textes |
| `src/style.css` | Jetons, mise en page, animations, écrans étroits |
| `src/app.js` | Lecteur d'écrans, animations autonomes, démonstrations, demande de démo |
| `src/medias/` | Vidéo d'ouverture et captures de l'application |
| `polices/` | Montserrat, Inter et JetBrains Mono, sous licence SIL OFL 1.1 |

## Utilisation

Flèches, Page suivante, molette, balayage ou boutons pour changer d'écran. `#s-bilan` à la fin de
l'adresse ouvre directement cet écran, sans l'ouverture. Les modules et les graphiques s'animent seuls,
jusqu'à ce que le visiteur intervienne ou appuie sur Pause.

La demande de démo s'envoie à `ENVOI_URL`, dans `src/app.js`, en POST JSON. Le service doit accepter les
appels depuis l'adresse de la page (CORS) et répondre par un statut 2xx. Tant que `ENVOI_URL` est vide, la
page ne transmet rien : elle prépare un message vers `CONTACTS` et l'ouvre dans la messagerie du visiteur.

Les chiffres des démonstrations sont d'illustration.

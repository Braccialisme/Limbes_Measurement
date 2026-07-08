# Limbe

Sextant, pélorus et table de l'almanach, numérisés. Une PWA qui superpose un
instrument de visée angulaire au liveview de la caméra : élévation au
sub-degré via l'IMU, azimut, séparation angulaire en deux taps, et la
géométrie de l'horizon pour transformer ces angles en distances et tailles.

- **Cas mer** : hauteur d'œil → distance d'horizon → taille max/plancher
  d'un objet selon que sa ligne de flottaison est visible ou tranchée.
- **Cas terre** (phase 2) : GPS + DEM + lancer de rayon le long de l'azimut
  → distance à vol d'oiseau et hauteur du « pitit château » sur la colline.

Zéro AR, zéro store, zéro backend. `npm run dev` pour lancer,
voir `CLAUDE.md` pour le contexte complet et la roadmap.

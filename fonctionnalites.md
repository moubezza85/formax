J'ai analysé l'ensemble de la base de code (Frontend React et Backend FastAPI) pour extraire toutes les fonctionnalités opérationnelles et structurelles de l'application **Formax ERP**.

Voici une synthèse détaillée des fonctionnalités réparties par modules :

### 1. Gestion des Utilisateurs et Rôles
*   **Système d'Authentification** : Gestion des accès par Email/Mot de passe avec JWT.
*   **Gestion des Rôles** : 3 niveaux d'accès : `ADMIN`, `TRAINER` (Formateur), `STUDENT` (Étudiant).
*   **Fiches Étudiants** : Suivi des informations personnelles, spécialités et historique d'inscription.
*   **Fiches Formateurs** : Profil détaillé incluant spécialités, niveau, et surtout la configuration du **mode de rémunération par défaut**.

### 2. Catalogue Pédagogique
*   **Gestion des Formations** : Création, modification et suppression (soft delete) des programmes (Titre, Description, Prix, Masse horaire).
*   **Système de Packs** : Regroupement de plusieurs formations avec un taux de réduction global.
*   **États des Formations** : Cycle de vie géré (`Brouillon`, `Active`, `Terminée`).

### 3. Le "Wizard" de Lancement (Cœur de l'ERP)
*   **Processus en 5 étapes** pour démarrer une session réelle :
    1.  **Configuration** de la formation (existante ou nouvelle).
    2.  **Assignation des Formateurs** avec définition spécifique de la rémunération pour cette mission (Horaire, Forfait, Par étudiant ou Mensuel).
    3.  **Inscriptions des Étudiants** (recherche ou création à la volée).
    4.  **Configuration Financière** pour chaque étudiant (remises personnalisées, échéanciers de paiement : total, mensuel, par tranche).
    5.  **Récapitulatif** et génération automatique de tous les enregistrements en base de données.

### 4. Suivi Opérationnel et Présences
*   **Gestion des Séances** : Planification et enregistrement des séances réalisées (date, durée, salle, formateur).
*   **Feuille d'Appel Digitale** : Marquage des présences par simple clic lors de la saisie d'une séance.
*   **Heatmap de Présence** : Visualisation sous forme de grille (Tableau des présences) pour voir l'assiduité de chaque étudiant sur l'ensemble de la formation.
*   **Calcul d'Assiduité** : Calcul automatique du % de présence par étudiant.

### 5. Gestion Financière et Paiements
*   **Suivi des Étudiants** : Gestion des soldes, enregistrement des versements, calcul des restes à payer (débiteurs).
*   **Rémunération des Formateurs** : 
    *   Calcul automatique des honoraires selon 4 modes (ex: Heures effectuées × Taux horaire).
    *   Enregistrement des paiements versés aux formateurs.
    *   Suivi du "Reste à percevoir" pour chaque formateur.

### 6. Rapports et Pilotage (Dashboard)
*   **Tableau de Bord Admin** : KPIs globaux (Chiffre d'affaires, Profit net, Nombre d'étudiants actifs, Top débiteurs).
*   **Rapports par Formation** : Rentabilité détaillée (Recettes - Coûts formateurs).
*   **Rapports par Formateur** : Historique complet des missions et des versements.
*   **Rapports par Étudiant** : Historique financier et pédagogique complet.
*   **Suivi des Créances** : Liste dédiée des impayés avec balance en temps réel.

### 7. Logistique (Salles)
*   **Gestion des Salles** : Création de salles avec capacité et couleur dédiée.
*   **Planning des Salles** : Vue calendrier/planning pour éviter les collisions et optimiser l'occupation des locaux.

---

**Note technique** : L'application utilise une architecture moderne avec **FastAPI** pour la rapidité de l'API, **SQLAlchemy** pour la robustesse des données, et **React** (avec Lucide-React pour les icônes) pour une interface fluide et "glassmorphism".
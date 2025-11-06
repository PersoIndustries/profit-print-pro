import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';

const resources = {
  en: {
    translation: {
      // Navigation
      nav: {
        dashboard: "Dashboard",
        materials: "Materials",
        projects: "Projects",
        orders: "Orders",
        calculator: "Calculator",
        pricing: "Pricing",
        admin: "Admin",
        logout: "Logout",
        login: "Login",
        signup: "Sign Up"
      },
      // Landing Page
      landing: {
        hero: {
          title: "Professional 3D Printing Business Management",
          subtitle: "Calculate costs, manage materials, track projects and orders all in one place",
          cta: "Get Started Free",
          ctaSecondary: "View Pricing"
        },
        features: {
          title: "Everything you need to manage your 3D printing business",
          calculator: {
            title: "Price Calculator",
            description: "Calculate accurate prices considering material, time, electricity and profit margin"
          },
          materials: {
            title: "Material Management",
            description: "Keep track of all your materials with prices, colors and types"
          },
          projects: {
            title: "Project Tracking",
            description: "Save and organize all your 3D printing projects"
          },
          orders: {
            title: "Order Management",
            description: "Organize and track customer orders efficiently"
          },
          metrics: {
            title: "Metrics & Analytics",
            description: "Visualize your business performance with detailed metrics"
          }
        }
      },
      // Auth
      auth: {
        login: "Login",
        signup: "Sign Up",
        email: "Email",
        password: "Password",
        fullName: "Full Name",
        forgotPassword: "Forgot Password?",
        resetPassword: "Reset Password",
        backToLogin: "Back to Login",
        noAccount: "Don't have an account?",
        hasAccount: "Already have an account?",
        signupLink: "Sign up here",
        loginLink: "Login here"
      },
      // Dashboard
      dashboard: {
        title: "Dashboard",
        overview: "Overview",
        totalProjects: "Total Projects",
        materials: "Materials",
        totalRevenue: "Total Revenue",
        avgProjectCost: "Average Project Cost",
        quickAccess: "Quick Access",
        calculatorCard: {
          title: "Calculator",
          description: "Calculate project prices"
        },
        materialsCard: {
          title: "Materials",
          description: "Manage your materials"
        },
        projectsCard: {
          title: "Projects",
          description: "View your projects"
        },
        ordersCard: {
          title: "Orders",
          description: "Manage customer orders"
        }
      },
      // Pricing
      pricing: {
        title: "Choose Your Plan",
        subtitle: "Select the plan that fits your business needs",
        monthly: "/month",
        free: {
          name: "Free",
          price: "0€",
          features: [
            "Price calculator",
            "Up to 10 material types",
            "Up to 15 projects",
            "15 monthly orders",
            "No metrics access"
          ],
          cta: "Get Started"
        },
        tier1: {
          name: "Professional",
          price: "10€",
          features: [
            "All Free features",
            "Up to 50 material types",
            "Up to 100 projects",
            "50 monthly orders",
            "60-day metrics history"
          ],
          cta: "Upgrade Now"
        },
        tier2: {
          name: "Business",
          price: "45€",
          features: [
            "All Professional features",
            "Unlimited materials",
            "Unlimited projects",
            "Unlimited orders",
            "2-year metrics history"
          ],
          cta: "Upgrade Now"
        }
      },
      // Materials
      materials: {
        title: "Materials",
        add: "Add Material",
        name: "Name",
        pricePerKg: "Price per Kg",
        color: "Color",
        type: "Type",
        save: "Save",
        cancel: "Cancel",
        delete: "Delete",
        empty: "No materials yet",
        limitReached: "Material limit reached for your plan"
      },
      // Projects
      projects: {
        title: "Projects",
        name: "Name",
        material: "Material",
        weight: "Weight",
        printTime: "Print Time",
        totalPrice: "Total Price",
        notes: "Notes",
        delete: "Delete",
        empty: "No projects yet",
        limitReached: "Project limit reached for your plan"
      },
      // Calculator
      calculator: {
        title: "3D Print Price Calculator",
        projectDetails: "Project Details",
        projectName: "Project Name",
        selectMaterial: "Select Material",
        weight: "Weight (grams)",
        printTime: "Print Time (hours)",
        costs: "Costs",
        electricityCost: "Electricity Cost (€/kWh)",
        printerWattage: "Printer Wattage (W)",
        laborCost: "Labor Cost (€/hour)",
        profitMargin: "Profit Margin (%)",
        notes: "Notes",
        calculate: "Calculate Price",
        save: "Save Project",
        totalPrice: "Total Price",
        backToDashboard: "Back to Dashboard"
      },
      // Orders
      orders: {
        title: "Orders",
        add: "Add Order",
        orderNumber: "Order Number",
        customer: "Customer",
        customerName: "Customer Name",
        customerEmail: "Customer Email",
        project: "Project",
        selectProject: "Select Project (optional)",
        amount: "Amount",
        status: "Status",
        statuses: {
          pending: "Pending",
          inProgress: "In Progress",
          completed: "Completed",
          cancelled: "Cancelled"
        },
        date: "Order Date",
        notes: "Notes",
        save: "Save",
        cancel: "Cancel",
        delete: "Delete",
        empty: "No orders yet",
        limitReached: "Monthly order limit reached for your plan",
        thisMonth: "This Month"
      },
      // Admin
      admin: {
        title: "Admin Dashboard",
        users: "Users",
        totalUsers: "Total Users",
        activeUsers: "Active Users",
        userList: "User List",
        email: "Email",
        tier: "Subscription Tier",
        role: "Role",
        joined: "Joined",
        materials: "Materials",
        projects: "Projects",
        orders: "Orders"
      },
      // Common
      common: {
        loading: "Loading...",
        save: "Save",
        cancel: "Cancel",
        delete: "Delete",
        edit: "Edit",
        add: "Add",
        search: "Search",
        filter: "Filter",
        close: "Close",
        confirm: "Confirm",
        success: "Success",
        error: "Error",
        warning: "Warning"
      }
    }
  },
  es: {
    translation: {
      nav: {
        dashboard: "Panel",
        materials: "Materiales",
        projects: "Proyectos",
        orders: "Pedidos",
        calculator: "Calculadora",
        pricing: "Precios",
        admin: "Administrador",
        logout: "Cerrar sesión",
        login: "Iniciar sesión",
        signup: "Registrarse"
      },
      landing: {
        hero: {
          title: "Gestión Profesional de Negocios de Impresión 3D",
          subtitle: "Calcula costos, gestiona materiales, sigue proyectos y pedidos todo en un solo lugar",
          cta: "Comenzar Gratis",
          ctaSecondary: "Ver Precios"
        },
        features: {
          title: "Todo lo que necesitas para gestionar tu negocio de impresión 3D",
          calculator: {
            title: "Calculadora de Precios",
            description: "Calcula precios precisos considerando material, tiempo, electricidad y margen de beneficio"
          },
          materials: {
            title: "Gestión de Materiales",
            description: "Mantén un registro de todos tus materiales con precios, colores y tipos"
          },
          projects: {
            title: "Seguimiento de Proyectos",
            description: "Guarda y organiza todos tus proyectos de impresión 3D"
          },
          orders: {
            title: "Gestión de Pedidos",
            description: "Organiza y rastrea pedidos de clientes eficientemente"
          },
          metrics: {
            title: "Métricas y Análisis",
            description: "Visualiza el rendimiento de tu negocio con métricas detalladas"
          }
        }
      },
      auth: {
        login: "Iniciar sesión",
        signup: "Registrarse",
        email: "Correo electrónico",
        password: "Contraseña",
        fullName: "Nombre completo",
        forgotPassword: "¿Olvidaste tu contraseña?",
        resetPassword: "Restablecer contraseña",
        backToLogin: "Volver al inicio de sesión",
        noAccount: "¿No tienes cuenta?",
        hasAccount: "¿Ya tienes cuenta?",
        signupLink: "Regístrate aquí",
        loginLink: "Inicia sesión aquí"
      },
      dashboard: {
        title: "Panel",
        overview: "Resumen",
        totalProjects: "Proyectos Totales",
        materials: "Materiales",
        totalRevenue: "Ingresos Totales",
        avgProjectCost: "Costo Promedio del Proyecto",
        quickAccess: "Acceso Rápido",
        calculatorCard: {
          title: "Calculadora",
          description: "Calcular precios de proyectos"
        },
        materialsCard: {
          title: "Materiales",
          description: "Gestionar tus materiales"
        },
        projectsCard: {
          title: "Proyectos",
          description: "Ver tus proyectos"
        },
        ordersCard: {
          title: "Pedidos",
          description: "Gestionar pedidos de clientes"
        }
      },
      pricing: {
        title: "Elige Tu Plan",
        subtitle: "Selecciona el plan que se adapte a las necesidades de tu negocio",
        monthly: "/mes",
        free: {
          name: "Gratis",
          price: "0€",
          features: [
            "Calculadora de precios",
            "Hasta 10 tipos de materiales",
            "Hasta 15 proyectos",
            "15 pedidos mensuales",
            "Sin acceso a métricas"
          ],
          cta: "Comenzar"
        },
        tier1: {
          name: "Profesional",
          price: "10€",
          features: [
            "Todas las funciones Gratis",
            "Hasta 50 tipos de materiales",
            "Hasta 100 proyectos",
            "50 pedidos mensuales",
            "Historial de métricas de 60 días"
          ],
          cta: "Actualizar Ahora"
        },
        tier2: {
          name: "Empresarial",
          price: "45€",
          features: [
            "Todas las funciones Profesional",
            "Materiales ilimitados",
            "Proyectos ilimitados",
            "Pedidos ilimitados",
            "Historial de métricas de 2 años"
          ],
          cta: "Actualizar Ahora"
        }
      },
      materials: {
        title: "Materiales",
        add: "Añadir Material",
        name: "Nombre",
        pricePerKg: "Precio por Kg",
        color: "Color",
        type: "Tipo",
        save: "Guardar",
        cancel: "Cancelar",
        delete: "Eliminar",
        empty: "No hay materiales todavía",
        limitReached: "Límite de materiales alcanzado para tu plan"
      },
      projects: {
        title: "Proyectos",
        name: "Nombre",
        material: "Material",
        weight: "Peso",
        printTime: "Tiempo de Impresión",
        totalPrice: "Precio Total",
        notes: "Notas",
        delete: "Eliminar",
        empty: "No hay proyectos todavía",
        limitReached: "Límite de proyectos alcanzado para tu plan"
      },
      calculator: {
        title: "Calculadora de Precio de Impresión 3D",
        projectDetails: "Detalles del Proyecto",
        projectName: "Nombre del Proyecto",
        selectMaterial: "Seleccionar Material",
        weight: "Peso (gramos)",
        printTime: "Tiempo de Impresión (horas)",
        costs: "Costos",
        electricityCost: "Costo de Electricidad (€/kWh)",
        printerWattage: "Potencia de la Impresora (W)",
        laborCost: "Costo de Mano de Obra (€/hora)",
        profitMargin: "Margen de Beneficio (%)",
        notes: "Notas",
        calculate: "Calcular Precio",
        save: "Guardar Proyecto",
        totalPrice: "Precio Total",
        backToDashboard: "Volver al Panel"
      },
      orders: {
        title: "Pedidos",
        add: "Añadir Pedido",
        orderNumber: "Número de Pedido",
        customer: "Cliente",
        customerName: "Nombre del Cliente",
        customerEmail: "Email del Cliente",
        project: "Proyecto",
        selectProject: "Seleccionar Proyecto (opcional)",
        amount: "Monto",
        status: "Estado",
        statuses: {
          pending: "Pendiente",
          inProgress: "En Progreso",
          completed: "Completado",
          cancelled: "Cancelado"
        },
        date: "Fecha del Pedido",
        notes: "Notas",
        save: "Guardar",
        cancel: "Cancelar",
        delete: "Eliminar",
        empty: "No hay pedidos todavía",
        limitReached: "Límite de pedidos mensuales alcanzado para tu plan",
        thisMonth: "Este Mes"
      },
      admin: {
        title: "Panel de Administrador",
        users: "Usuarios",
        totalUsers: "Total de Usuarios",
        activeUsers: "Usuarios Activos",
        userList: "Lista de Usuarios",
        email: "Correo",
        tier: "Plan de Suscripción",
        role: "Rol",
        joined: "Registrado",
        materials: "Materiales",
        projects: "Proyectos",
        orders: "Pedidos"
      },
      common: {
        loading: "Cargando...",
        save: "Guardar",
        cancel: "Cancelar",
        delete: "Eliminar",
        edit: "Editar",
        add: "Añadir",
        search: "Buscar",
        filter: "Filtrar",
        close: "Cerrar",
        confirm: "Confirmar",
        success: "Éxito",
        error: "Error",
        warning: "Advertencia"
      }
    }
  },
  fr: {
    translation: {
      nav: {
        dashboard: "Tableau de bord",
        materials: "Matériaux",
        projects: "Projets",
        orders: "Commandes",
        calculator: "Calculatrice",
        pricing: "Tarification",
        admin: "Administrateur",
        logout: "Déconnexion",
        login: "Connexion",
        signup: "S'inscrire"
      },
      landing: {
        hero: {
          title: "Gestion Professionnelle d'Entreprise d'Impression 3D",
          subtitle: "Calculez les coûts, gérez les matériaux, suivez les projets et les commandes en un seul endroit",
          cta: "Commencer Gratuitement",
          ctaSecondary: "Voir les Tarifs"
        },
        features: {
          title: "Tout ce dont vous avez besoin pour gérer votre entreprise d'impression 3D",
          calculator: {
            title: "Calculateur de Prix",
            description: "Calculez des prix précis en tenant compte du matériau, du temps, de l'électricité et de la marge bénéficiaire"
          },
          materials: {
            title: "Gestion des Matériaux",
            description: "Gardez une trace de tous vos matériaux avec les prix, couleurs et types"
          },
          projects: {
            title: "Suivi des Projets",
            description: "Enregistrez et organisez tous vos projets d'impression 3D"
          },
          orders: {
            title: "Gestion des Commandes",
            description: "Organisez et suivez les commandes clients efficacement"
          },
          metrics: {
            title: "Métriques et Analyses",
            description: "Visualisez les performances de votre entreprise avec des métriques détaillées"
          }
        }
      },
      auth: {
        login: "Connexion",
        signup: "S'inscrire",
        email: "Email",
        password: "Mot de passe",
        fullName: "Nom complet",
        forgotPassword: "Mot de passe oublié?",
        resetPassword: "Réinitialiser le mot de passe",
        backToLogin: "Retour à la connexion",
        noAccount: "Vous n'avez pas de compte?",
        hasAccount: "Vous avez déjà un compte?",
        signupLink: "Inscrivez-vous ici",
        loginLink: "Connectez-vous ici"
      },
      dashboard: {
        title: "Tableau de bord",
        overview: "Aperçu",
        totalProjects: "Total des Projets",
        materials: "Matériaux",
        totalRevenue: "Revenu Total",
        avgProjectCost: "Coût Moyen du Projet",
        quickAccess: "Accès Rapide",
        calculatorCard: {
          title: "Calculatrice",
          description: "Calculer les prix des projets"
        },
        materialsCard: {
          title: "Matériaux",
          description: "Gérer vos matériaux"
        },
        projectsCard: {
          title: "Projets",
          description: "Voir vos projets"
        },
        ordersCard: {
          title: "Commandes",
          description: "Gérer les commandes clients"
        }
      },
      pricing: {
        title: "Choisissez Votre Plan",
        subtitle: "Sélectionnez le plan qui correspond aux besoins de votre entreprise",
        monthly: "/mois",
        free: {
          name: "Gratuit",
          price: "0€",
          features: [
            "Calculateur de prix",
            "Jusqu'à 10 types de matériaux",
            "Jusqu'à 15 projets",
            "15 commandes mensuelles",
            "Pas d'accès aux métriques"
          ],
          cta: "Commencer"
        },
        tier1: {
          name: "Professionnel",
          price: "10€",
          features: [
            "Toutes les fonctionnalités Gratuites",
            "Jusqu'à 50 types de matériaux",
            "Jusqu'à 100 projets",
            "50 commandes mensuelles",
            "Historique des métriques de 60 jours"
          ],
          cta: "Mettre à Niveau Maintenant"
        },
        tier2: {
          name: "Entreprise",
          price: "45€",
          features: [
            "Toutes les fonctionnalités Professionnelles",
            "Matériaux illimités",
            "Projets illimités",
            "Commandes illimitées",
            "Historique des métriques de 2 ans"
          ],
          cta: "Mettre à Niveau Maintenant"
        }
      },
      materials: {
        title: "Matériaux",
        add: "Ajouter un Matériau",
        name: "Nom",
        pricePerKg: "Prix par Kg",
        color: "Couleur",
        type: "Type",
        save: "Enregistrer",
        cancel: "Annuler",
        delete: "Supprimer",
        empty: "Pas encore de matériaux",
        limitReached: "Limite de matériaux atteinte pour votre plan"
      },
      projects: {
        title: "Projets",
        name: "Nom",
        material: "Matériau",
        weight: "Poids",
        printTime: "Temps d'Impression",
        totalPrice: "Prix Total",
        notes: "Notes",
        delete: "Supprimer",
        empty: "Pas encore de projets",
        limitReached: "Limite de projets atteinte pour votre plan"
      },
      calculator: {
        title: "Calculateur de Prix d'Impression 3D",
        projectDetails: "Détails du Projet",
        projectName: "Nom du Projet",
        selectMaterial: "Sélectionner un Matériau",
        weight: "Poids (grammes)",
        printTime: "Temps d'Impression (heures)",
        costs: "Coûts",
        electricityCost: "Coût de l'Électricité (€/kWh)",
        printerWattage: "Puissance de l'Imprimante (W)",
        laborCost: "Coût de la Main-d'œuvre (€/heure)",
        profitMargin: "Marge Bénéficiaire (%)",
        notes: "Notes",
        calculate: "Calculer le Prix",
        save: "Enregistrer le Projet",
        totalPrice: "Prix Total",
        backToDashboard: "Retour au Tableau de Bord"
      },
      orders: {
        title: "Commandes",
        add: "Ajouter une Commande",
        orderNumber: "Numéro de Commande",
        customer: "Client",
        customerName: "Nom du Client",
        customerEmail: "Email du Client",
        project: "Projet",
        selectProject: "Sélectionner un Projet (optionnel)",
        amount: "Montant",
        status: "Statut",
        statuses: {
          pending: "En Attente",
          inProgress: "En Cours",
          completed: "Terminé",
          cancelled: "Annulé"
        },
        date: "Date de Commande",
        notes: "Notes",
        save: "Enregistrer",
        cancel: "Annuler",
        delete: "Supprimer",
        empty: "Pas encore de commandes",
        limitReached: "Limite de commandes mensuelles atteinte pour votre plan",
        thisMonth: "Ce Mois"
      },
      admin: {
        title: "Tableau de Bord Administrateur",
        users: "Utilisateurs",
        totalUsers: "Total des Utilisateurs",
        activeUsers: "Utilisateurs Actifs",
        userList: "Liste des Utilisateurs",
        email: "Email",
        tier: "Plan d'Abonnement",
        role: "Rôle",
        joined: "Inscrit",
        materials: "Matériaux",
        projects: "Projets",
        orders: "Commandes"
      },
      common: {
        loading: "Chargement...",
        save: "Enregistrer",
        cancel: "Annuler",
        delete: "Supprimer",
        edit: "Modifier",
        add: "Ajouter",
        search: "Rechercher",
        filter: "Filtrer",
        close: "Fermer",
        confirm: "Confirmer",
        success: "Succès",
        error: "Erreur",
        warning: "Avertissement"
      }
    }
  }
};

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources,
    fallbackLng: 'en',
    interpolation: {
      escapeValue: false
    }
  });

export default i18n;

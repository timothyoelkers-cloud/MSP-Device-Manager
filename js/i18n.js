/* ============================================================
   i18n.js — Multi-language Support (Internationalization)
   ============================================================ */

const I18n = (() => {
    const STORAGE_KEY = 'app_language';
    const DEFAULT_LANG = 'en';

    const languages = [
        { code: 'en', name: 'English',  nativeName: 'English'  },
        { code: 'de', name: 'German',   nativeName: 'Deutsch'  },
        { code: 'fr', name: 'French',   nativeName: 'Français' },
        { code: 'es', name: 'Spanish',  nativeName: 'Español'  }
    ];

    // ── Translation Dictionaries ──────────────────────────────

    const translations = {

        // ── English ───────────────────────────────────────────
        en: {
            nav: {
                dashboard:         'Dashboard',
                devices:           'Devices',
                users:             'Users',
                groups:            'Groups',
                policies:          'Policies',
                apps:              'Apps',
                reports:           'Reports',
                settings:          'Settings',
                comparison:        'Comparison',
                audit_log:         'Audit Log',
                sync_dashboard:    'Sync Dashboard',
                license_optimizer: 'License Optimizer',
                incident_response: 'Incident Response',
                saved_views:       'Saved Views',
                notifications:     'Notifications'
            },
            common: {
                save:        'Save',
                cancel:      'Cancel',
                delete:      'Delete',
                edit:        'Edit',
                create:      'Create',
                search:      'Search',
                export:      'Export',
                refresh:     'Refresh',
                loading:     'Loading…',
                no_data:     'No data available',
                confirm:     'Confirm',
                close:       'Close',
                back:        'Back',
                next:        'Next',
                apply:       'Apply',
                reset:       'Reset',
                enabled:     'Enabled',
                disabled:    'Disabled',
                name:        'Name',
                description: 'Description',
                status:      'Status',
                actions:     'Actions',
                all:         'All',
                none:        'None',
                select_all:  'Select All'
            },
            dashboard: {
                total_devices:    'Total Devices',
                compliant:        'Compliant',
                noncompliant:     'Non-Compliant',
                total_users:      'Total Users',
                active_users:     'Active Users',
                compliance_rate:  'Compliance Rate',
                encryption_rate:  'Encryption Rate',
                os_distribution:  'OS Distribution',
                recent_activity:  'Recent Activity'
            },
            devices: {
                device_name:     'Device Name',
                os:              'Operating System',
                compliance_state:'Compliance State',
                last_sync:       'Last Sync',
                owner:           'Owner',
                encrypted:       'Encrypted',
                managed:         'Managed',
                enrolled_date:   'Enrolled Date',
                sync_device:     'Sync Device',
                wipe_device:     'Wipe Device',
                retire_device:   'Retire Device',
                restart_device:  'Restart Device'
            },
            users: {
                display_name:    'Display Name',
                email:           'Email',
                account_enabled: 'Account Enabled',
                licensed:        'Licensed',
                last_sign_in:    'Last Sign-In',
                department:      'Department',
                job_title:       'Job Title',
                reset_password:  'Reset Password',
                revoke_sessions: 'Revoke Sessions',
                disable_account: 'Disable Account',
                enable_account:  'Enable Account'
            },
            alerts: {
                rule_name:    'Rule Name',
                severity:     'Severity',
                threshold:    'Threshold',
                metric:       'Metric',
                triggered_at: 'Triggered At',
                acknowledged: 'Acknowledged',
                info:         'Info',
                warning:      'Warning',
                critical:     'Critical'
            },
            i18n: {
                language:         'Language',
                language_changed: 'Language changed to English'
            }
        },

        // ── German ────────────────────────────────────────────
        de: {
            nav: {
                dashboard:         'Übersicht',
                devices:           'Geräte',
                users:             'Benutzer',
                groups:            'Gruppen',
                policies:          'Richtlinien',
                apps:              'Anwendungen',
                reports:           'Berichte',
                settings:          'Einstellungen',
                comparison:        'Vergleich',
                audit_log:         'Überwachungsprotokoll',
                sync_dashboard:    'Synchronisierungsübersicht',
                license_optimizer: 'Lizenzoptimierung',
                incident_response: 'Vorfallreaktion',
                saved_views:       'Gespeicherte Ansichten',
                notifications:     'Benachrichtigungen'
            },
            common: {
                save:        'Speichern',
                cancel:      'Abbrechen',
                delete:      'Löschen',
                edit:        'Bearbeiten',
                create:      'Erstellen',
                search:      'Suchen',
                export:      'Exportieren',
                refresh:     'Aktualisieren',
                loading:     'Wird geladen…',
                no_data:     'Keine Daten verfügbar',
                confirm:     'Bestätigen',
                close:       'Schließen',
                back:        'Zurück',
                next:        'Weiter',
                apply:       'Anwenden',
                reset:       'Zurücksetzen',
                enabled:     'Aktiviert',
                disabled:    'Deaktiviert',
                name:        'Name',
                description: 'Beschreibung',
                status:      'Status',
                actions:     'Aktionen',
                all:         'Alle',
                none:        'Keine',
                select_all:  'Alle auswählen'
            },
            dashboard: {
                total_devices:    'Geräte insgesamt',
                compliant:        'Konform',
                noncompliant:     'Nicht konform',
                total_users:      'Benutzer insgesamt',
                active_users:     'Aktive Benutzer',
                compliance_rate:  'Konformitätsrate',
                encryption_rate:  'Verschlüsselungsrate',
                os_distribution:  'Betriebssystemverteilung',
                recent_activity:  'Letzte Aktivität'
            },
            devices: {
                device_name:     'Gerätename',
                os:              'Betriebssystem',
                compliance_state:'Konformitätsstatus',
                last_sync:       'Letzte Synchronisierung',
                owner:           'Besitzer',
                encrypted:       'Verschlüsselt',
                managed:         'Verwaltet',
                enrolled_date:   'Registrierungsdatum',
                sync_device:     'Gerät synchronisieren',
                wipe_device:     'Gerät zurücksetzen',
                retire_device:   'Gerät außer Betrieb nehmen',
                restart_device:  'Gerät neu starten'
            },
            users: {
                display_name:    'Anzeigename',
                email:           'E-Mail',
                account_enabled: 'Konto aktiviert',
                licensed:        'Lizenziert',
                last_sign_in:    'Letzte Anmeldung',
                department:      'Abteilung',
                job_title:       'Berufsbezeichnung',
                reset_password:  'Kennwort zurücksetzen',
                revoke_sessions: 'Sitzungen widerrufen',
                disable_account: 'Konto deaktivieren',
                enable_account:  'Konto aktivieren'
            },
            alerts: {
                rule_name:    'Regelname',
                severity:     'Schweregrad',
                threshold:    'Schwellenwert',
                metric:       'Metrik',
                triggered_at: 'Ausgelöst am',
                acknowledged: 'Bestätigt',
                info:         'Info',
                warning:      'Warnung',
                critical:     'Kritisch'
            },
            i18n: {
                language:         'Sprache',
                language_changed: 'Sprache auf Deutsch geändert'
            }
        },

        // ── French ────────────────────────────────────────────
        fr: {
            nav: {
                dashboard:         'Tableau de bord',
                devices:           'Appareils',
                users:             'Utilisateurs',
                groups:            'Groupes',
                policies:          'Stratégies',
                apps:              'Applications',
                reports:           'Rapports',
                settings:          'Paramètres',
                comparison:        'Comparaison',
                audit_log:         'Journal d\'audit',
                sync_dashboard:    'Tableau de synchronisation',
                license_optimizer: 'Optimiseur de licences',
                incident_response: 'Réponse aux incidents',
                saved_views:       'Vues enregistrées',
                notifications:     'Notifications'
            },
            common: {
                save:        'Enregistrer',
                cancel:      'Annuler',
                delete:      'Supprimer',
                edit:        'Modifier',
                create:      'Créer',
                search:      'Rechercher',
                export:      'Exporter',
                refresh:     'Actualiser',
                loading:     'Chargement…',
                no_data:     'Aucune donnée disponible',
                confirm:     'Confirmer',
                close:       'Fermer',
                back:        'Retour',
                next:        'Suivant',
                apply:       'Appliquer',
                reset:       'Réinitialiser',
                enabled:     'Activé',
                disabled:    'Désactivé',
                name:        'Nom',
                description: 'Description',
                status:      'Statut',
                actions:     'Actions',
                all:         'Tout',
                none:        'Aucun',
                select_all:  'Tout sélectionner'
            },
            dashboard: {
                total_devices:    'Total des appareils',
                compliant:        'Conforme',
                noncompliant:     'Non conforme',
                total_users:      'Total des utilisateurs',
                active_users:     'Utilisateurs actifs',
                compliance_rate:  'Taux de conformité',
                encryption_rate:  'Taux de chiffrement',
                os_distribution:  'Répartition des OS',
                recent_activity:  'Activité récente'
            },
            devices: {
                device_name:     'Nom de l\'appareil',
                os:              'Système d\'exploitation',
                compliance_state:'État de conformité',
                last_sync:       'Dernière synchronisation',
                owner:           'Propriétaire',
                encrypted:       'Chiffré',
                managed:         'Géré',
                enrolled_date:   'Date d\'inscription',
                sync_device:     'Synchroniser l\'appareil',
                wipe_device:     'Réinitialiser l\'appareil',
                retire_device:   'Mettre l\'appareil hors service',
                restart_device:  'Redémarrer l\'appareil'
            },
            users: {
                display_name:    'Nom d\'affichage',
                email:           'E-mail',
                account_enabled: 'Compte activé',
                licensed:        'Sous licence',
                last_sign_in:    'Dernière connexion',
                department:      'Département',
                job_title:       'Intitulé du poste',
                reset_password:  'Réinitialiser le mot de passe',
                revoke_sessions: 'Révoquer les sessions',
                disable_account: 'Désactiver le compte',
                enable_account:  'Activer le compte'
            },
            alerts: {
                rule_name:    'Nom de la règle',
                severity:     'Sévérité',
                threshold:    'Seuil',
                metric:       'Métrique',
                triggered_at: 'Déclenché le',
                acknowledged: 'Acquitté',
                info:         'Info',
                warning:      'Avertissement',
                critical:     'Critique'
            },
            i18n: {
                language:         'Langue',
                language_changed: 'Langue changée en français'
            }
        },

        // ── Spanish ───────────────────────────────────────────
        es: {
            nav: {
                dashboard:         'Panel',
                devices:           'Dispositivos',
                users:             'Usuarios',
                groups:            'Grupos',
                policies:          'Directivas',
                apps:              'Aplicaciones',
                reports:           'Informes',
                settings:          'Configuración',
                comparison:        'Comparación',
                audit_log:         'Registro de auditoría',
                sync_dashboard:    'Panel de sincronización',
                license_optimizer: 'Optimizador de licencias',
                incident_response: 'Respuesta a incidentes',
                saved_views:       'Vistas guardadas',
                notifications:     'Notificaciones'
            },
            common: {
                save:        'Guardar',
                cancel:      'Cancelar',
                delete:      'Eliminar',
                edit:        'Editar',
                create:      'Crear',
                search:      'Buscar',
                export:      'Exportar',
                refresh:     'Actualizar',
                loading:     'Cargando…',
                no_data:     'No hay datos disponibles',
                confirm:     'Confirmar',
                close:       'Cerrar',
                back:        'Atrás',
                next:        'Siguiente',
                apply:       'Aplicar',
                reset:       'Restablecer',
                enabled:     'Habilitado',
                disabled:    'Deshabilitado',
                name:        'Nombre',
                description: 'Descripción',
                status:      'Estado',
                actions:     'Acciones',
                all:         'Todo',
                none:        'Ninguno',
                select_all:  'Seleccionar todo'
            },
            dashboard: {
                total_devices:    'Total de dispositivos',
                compliant:        'Compatible',
                noncompliant:     'No compatible',
                total_users:      'Total de usuarios',
                active_users:     'Usuarios activos',
                compliance_rate:  'Tasa de cumplimiento',
                encryption_rate:  'Tasa de cifrado',
                os_distribution:  'Distribución de SO',
                recent_activity:  'Actividad reciente'
            },
            devices: {
                device_name:     'Nombre del dispositivo',
                os:              'Sistema operativo',
                compliance_state:'Estado de cumplimiento',
                last_sync:       'Última sincronización',
                owner:           'Propietario',
                encrypted:       'Cifrado',
                managed:         'Administrado',
                enrolled_date:   'Fecha de inscripción',
                sync_device:     'Sincronizar dispositivo',
                wipe_device:     'Borrar dispositivo',
                retire_device:   'Retirar dispositivo',
                restart_device:  'Reiniciar dispositivo'
            },
            users: {
                display_name:    'Nombre para mostrar',
                email:           'Correo electrónico',
                account_enabled: 'Cuenta habilitada',
                licensed:        'Con licencia',
                last_sign_in:    'Último inicio de sesión',
                department:      'Departamento',
                job_title:       'Puesto',
                reset_password:  'Restablecer contraseña',
                revoke_sessions: 'Revocar sesiones',
                disable_account: 'Deshabilitar cuenta',
                enable_account:  'Habilitar cuenta'
            },
            alerts: {
                rule_name:    'Nombre de la regla',
                severity:     'Gravedad',
                threshold:    'Umbral',
                metric:       'Métrica',
                triggered_at: 'Activado el',
                acknowledged: 'Confirmado',
                info:         'Información',
                warning:      'Advertencia',
                critical:     'Crítico'
            },
            i18n: {
                language:         'Idioma',
                language_changed: 'Idioma cambiado a español'
            }
        }
    };

    // ── Private Helpers ───────────────────────────────────────

    let currentLang = localStorage.getItem(STORAGE_KEY) || DEFAULT_LANG;

    // Validate stored language; fall back to default if invalid
    if (!translations[currentLang]) {
        currentLang = DEFAULT_LANG;
    }

    /**
     * Resolve a dot-notation key against a dictionary object.
     * Returns undefined if any segment is missing.
     */
    function resolve(obj, key) {
        const parts = key.split('.');
        let node = obj;
        for (let i = 0; i < parts.length; i++) {
            if (node == null || typeof node !== 'object') return undefined;
            node = node[parts[i]];
        }
        return node;
    }

    // ── Public API ────────────────────────────────────────────

    /**
     * Translate a dot-notation key (e.g. 'nav.dashboard').
     * 1. Try the current language
     * 2. Fall back to English
     * 3. Return the raw key if nothing found
     */
    function t(key) {
        let value = resolve(translations[currentLang], key);
        if (typeof value === 'string') return value;

        // Fallback to English
        if (currentLang !== DEFAULT_LANG) {
            value = resolve(translations[DEFAULT_LANG], key);
            if (typeof value === 'string') return value;
        }

        return key;
    }

    /**
     * Switch the active language and persist the choice.
     */
    function setLanguage(langCode) {
        if (!translations[langCode]) {
            if (typeof Toast !== 'undefined') {
                Toast.show('Unsupported language: ' + langCode, 'error');
            }
            return;
        }

        currentLang = langCode;
        localStorage.setItem(STORAGE_KEY, langCode);

        // Persist to AppState if available
        if (typeof AppState !== 'undefined' && AppState.set) {
            AppState.set('language', langCode);
        }

        // Notify the user
        const confirmMsg = resolve(translations[langCode], 'i18n.language_changed')
            || 'Language changed';
        if (typeof Toast !== 'undefined') {
            Toast.show(confirmMsg, 'success');
        }
    }

    /**
     * Return the currently active language code.
     */
    function getLanguage() {
        return currentLang;
    }

    /**
     * Return the list of supported languages with metadata.
     */
    function getAvailableLanguages() {
        return languages.map(function (l) {
            return { code: l.code, name: l.name, nativeName: l.nativeName };
        });
    }

    /**
     * Render an HTML <select> dropdown for language selection.
     * Attach an onchange handler via the global I18n reference.
     */
    function renderLanguageSelector() {
        const label = t('i18n.language');
        let html = '<select class="form-select btn-sm" '
            + 'aria-label="' + label + '" '
            + 'onchange="I18n.setLanguage(this.value)">';

        for (let i = 0; i < languages.length; i++) {
            const lang = languages[i];
            const selected = lang.code === currentLang ? ' selected' : '';
            html += '<option value="' + lang.code + '"' + selected + '>'
                + lang.nativeName + ' (' + lang.name + ')'
                + '</option>';
        }

        html += '</select>';
        return html;
    }

    // ── Expose ────────────────────────────────────────────────

    return {
        t:                      t,
        setLanguage:            setLanguage,
        getLanguage:            getLanguage,
        getAvailableLanguages:  getAvailableLanguages,
        renderLanguageSelector: renderLanguageSelector
    };
})();

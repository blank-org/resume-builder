(function () {
    const SKIP_KEYS = new Set([
        'name', 'location', 'phone', 'email', 'summary', 'intro', 'now', 'section_order'
    ]);

    const PROFILES = {
        current: { src: './data/data.json.js', label: 'Current' },
        grok: { src: './data/data.json_grok.js', label: 'Grok' },
        'grok-full': { src: './data/data.json_grok_full.js', label: 'Grok full' }
    };

    const FALLBACK_SOURCES = ['./data/data.json.js', './data.json.js'];
    const STORAGE_PROFILE = 'resume.activeProfile';
    const STORAGE_APPEARANCE = 'resume.activeAppearance';

    let activeProfileKey = 'current';
    let previewHistoryPushed = false;

    document.addEventListener('DOMContentLoaded', function () {
        initChrome();
        activeProfileKey = resolveInitialProfile();
        syncProfileSelect();
        loadProfile(activeProfileKey).then(function () {
            renderResume();
        });
    });

    function resolveInitialProfile() {
        const params = new URLSearchParams(window.location.search);
        const fromQuery = params.get('profile');
        if (fromQuery && PROFILES[fromQuery]) {
            localStorage.setItem(STORAGE_PROFILE, fromQuery);
            return fromQuery;
        }
        const stored = localStorage.getItem(STORAGE_PROFILE);
        if (stored && PROFILES[stored]) {
            return stored;
        }
        return 'current';
    }

    function initChrome() {
        const profileSelect = document.getElementById('profile-select');
        if (profileSelect) {
            profileSelect.innerHTML = Object.entries(PROFILES).map(function (entry) {
                const key = entry[0];
                const profile = entry[1];
                return '<option value="' + key + '">' + profile.label + '</option>';
            }).join('');
            profileSelect.addEventListener('change', function () {
                setActiveProfile(profileSelect.value);
            });
        }

        const previewToggle = document.getElementById('preview-toggle');
        if (previewToggle) {
            previewToggle.addEventListener('click', function () {
                const entering = !document.body.classList.contains('preview-mode');
                setPreviewMode(entering);
            });
        }

        window.addEventListener('popstate', function (event) {
            const inPreview = !!(event.state && event.state.resumePreview);
            previewHistoryPushed = inPreview;
            applyPreviewMode(inPreview);
        });

        const themeToggle = document.getElementById('theme-toggle');
        if (themeToggle) {
            syncThemeToggle(themeToggle);
            themeToggle.addEventListener('click', function () {
                const nextTheme = document.body.dataset.activeTheme === 'dark' ? 'light' : 'dark';
                applyTheme(nextTheme);
                syncThemeToggle(themeToggle);
            });
        }
    }

    function applyPreviewMode(on) {
        document.body.classList.toggle('preview-mode', on);
        const previewToggle = document.getElementById('preview-toggle');
        if (previewToggle) {
            previewToggle.setAttribute('aria-pressed', on ? 'true' : 'false');
        }
    }

    function setPreviewMode(on) {
        if (on === document.body.classList.contains('preview-mode')) {
            return;
        }
        if (on) {
            applyPreviewMode(true);
            history.pushState({ resumePreview: true, profile: activeProfileKey }, '', window.location.href);
            previewHistoryPushed = true;
            return;
        }
        if (previewHistoryPushed) {
            history.back();
            return;
        }
        applyPreviewMode(false);
    }

    function syncProfileSelect() {
        const profileSelect = document.getElementById('profile-select');
        if (profileSelect) {
            profileSelect.value = activeProfileKey;
        }
    }

    function syncThemeToggle(themeToggle) {
        const isDark = document.body.dataset.activeTheme === 'dark';
        const label = themeToggle.querySelector('.toolbar-btn-label');
        if (label) {
            label.textContent = isDark ? 'Light' : 'Dark';
        }
        themeToggle.setAttribute('aria-pressed', isDark ? 'true' : 'false');
        themeToggle.setAttribute('aria-label', isDark ? 'Light' : 'Dark');
    }

    function applyTheme(theme) {
        document.documentElement.classList.remove('theme-light', 'theme-dark');
        document.documentElement.classList.add('theme-' + theme);
        document.documentElement.dataset.activeTheme = theme;
        document.body.classList.remove('theme-light', 'theme-dark');
        document.body.classList.add('theme-' + theme);
        document.body.dataset.activeTheme = theme;
        localStorage.setItem(STORAGE_APPEARANCE, theme);
    }

    function updateProfileQuery(profileKey) {
        const url = new URL(window.location.href);
        url.searchParams.set('profile', profileKey);
        history.replaceState({
            resumePreview: document.body.classList.contains('preview-mode'),
            profile: profileKey
        }, '', url.toString());
    }

    function setActiveProfile(profileKey) {
        if (!PROFILES[profileKey]) {
            return;
        }
        activeProfileKey = profileKey;
        localStorage.setItem(STORAGE_PROFILE, profileKey);
        updateProfileQuery(profileKey);
        syncProfileSelect();
        loadProfile(profileKey).then(function () {
            renderResume();
        });
    }

    function removeResumeDataScript() {
        const existing = document.getElementById('resume-data-script');
        if (existing) {
            existing.remove();
        }
        delete window.resumeData;
    }

    function injectScript(src) {
        return new Promise(function (resolve, reject) {
            const script = document.createElement('script');
            script.id = 'resume-data-script';
            script.src = src;
            script.onload = function () {
                resolve();
            };
            script.onerror = function () {
                reject(new Error('Failed to load ' + src));
            };
            document.head.appendChild(script);
        });
    }

    function loadProfile(profileKey) {
        const profile = PROFILES[profileKey] || PROFILES.current;
        removeResumeDataScript();
        return injectScript(profile.src).then(function () {
            if (typeof window.resumeData === 'undefined') {
                return loadFallbackSources();
            }
        }).catch(function () {
            return loadFallbackSources();
        });
    }

    function loadFallbackSources() {
        removeResumeDataScript();
        let chain = Promise.reject();
        FALLBACK_SOURCES.forEach(function (src) {
            chain = chain.catch(function () {
                return injectScript(src).then(function () {
                    if (typeof window.resumeData === 'undefined') {
                        throw new Error('resumeData missing after ' + src);
                    }
                });
            });
        });
        return chain;
    }

    function setIfExists(id, fn) {
        const el = document.getElementById(id);
        if (el) {
            fn(el);
        }
    }

    function renderResume() {
        const data = window.resumeData;
        if (!data) {
            return;
        }

        setIfExists('page-title', function (el) {
            el.textContent = data.name ? data.name + ' - Résumé' : 'Résumé';
        });
        setIfExists('name', function (el) {
            el.textContent = data.name || '';
        });
        setIfExists('summary', function (el) {
            const summary = data.summary;
            let items = [];
            if (Array.isArray(summary)) {
                items = summary;
            } else if (typeof summary === 'string') {
                items = summary.split(/[.\n]/).map(function (s) { return s.trim(); }).filter(Boolean);
            }
            if (items.length > 0) {
                if (items.length === 1) {
                    el.innerHTML = '<p class="summary-item">' + items[0] + '</p>';
                } else {
                    el.innerHTML = '<ul class="summary-list">' + items.map(function (item) {
                        return '<li>' + item + '</li>';
                    }).join('') + '</ul>';
                }
            } else if (typeof summary === 'string') {
                el.textContent = summary;
            } else {
                el.innerHTML = '';
            }
        });

        const introSection = document.querySelector('.top-right');
        if (introSection) {
            let introHtml = '';
            if (data.intro) {
                if (hasRenderableValue(data.intro.designation)) {
                    introHtml += '<div class="designation">' + data.intro.designation + '</div>';
                }
                if (hasRenderableValue(data.intro.experience)) {
                    introHtml += '<div class="experience-years">' + data.intro.experience + '</div>';
                }
            }
            if (hasRenderableValue(data.now)) {
                introHtml += '<div class="now-chip">' + data.now + '</div>';
            }
            introSection.innerHTML = introHtml;
        }

        const dynamicSections = document.getElementById('dynamic-sections');
        if (!dynamicSections) {
            return;
        }

        let allSectionsHtml = '';
        getSectionKeys(data).forEach(function (key) {
            const value = data[key];
            if (typeof value !== 'object' || value === null) {
                return;
            }
            allSectionsHtml += renderSection(key, value, data);
        });

        const temp = document.createElement('div');
        temp.innerHTML = allSectionsHtml;
        if (temp.lastElementChild) {
            temp.lastElementChild.classList.add('print-bottom-border');
        }
        dynamicSections.innerHTML = '';
        while (temp.firstChild) {
            dynamicSections.appendChild(temp.firstChild);
        }
    }

    function getSectionKeys(data) {
        if (Array.isArray(data.section_order)) {
            return data.section_order.filter(function (key) {
                return !SKIP_KEYS.has(key) && data[key] !== undefined;
            });
        }
        return Object.keys(data).filter(function (key) {
            if (SKIP_KEYS.has(key)) {
                return false;
            }
            const value = data[key];
            return typeof value === 'object' && value !== null;
        });
    }

    function hasRenderableValue(value) {
        if (value === null || value === undefined) {
            return false;
        }
        if (typeof value === 'string') {
            return value.trim() !== '';
        }
        if (Array.isArray(value)) {
            return value.some(function (item) { return hasRenderableValue(item); });
        }
        if (typeof value === 'object') {
            return Object.values(value).some(function (item) { return hasRenderableValue(item); });
        }
        return true;
    }

    function prettifyKey(key) {
        if (key === 'prior_art') {
            return 'Prior Art';
        }
        return key.replace(/_/g, ' ').replace(/\b\w/g, function (c) { return c.toUpperCase(); });
    }

    function filterSkillPlaceholders(items) {
        if (!Array.isArray(items)) {
            return items;
        }
        return items.filter(function (item) {
            const s = String(item).trim();
            return s !== '' && s !== '.' && s !== '…' && s !== '...';
        });
    }

    function renderSection(key, value, data) {
        const normalizedKey = key === 'ventures' ? 'products' : key;
        const title = prettifyKey(normalizedKey);
        let html = '<div class="col-full' + (key === 'contact-info' || key === 'contact_info' ? ' avoid-break' : '') + '">';
        html += '<div class="col-left"><h2>' + title + '</h2></div>';

        if (key.toLowerCase().includes('persona')) {
            html += '<div class="col-right" id="' + key + '">';
            if (Array.isArray(value)) {
                value.forEach(function (item) {
                    if (!hasRenderableValue(item && item.label) && !hasRenderableValue(item && item.value)) {
                        return;
                    }
                    html += '<div class="col-right avoid-break">\n<div class="meta">\n<span class="C1"><strong>' + (item.label || '') + '</strong></span><span class="C2">&nbsp;</span><span class="title C3">' + (item.value || '') + '</span>\n</div>\n</div>';
                });
            } else if (typeof value === 'object' && value !== null) {
                Object.entries(value).forEach(function (entry) {
                    const label = entry[0];
                    const val = entry[1];
                    if (!hasRenderableValue(val)) {
                        return;
                    }
                    const displayValue = Array.isArray(val)
                        ? filterSkillPlaceholders(val).filter(function (item) { return hasRenderableValue(item); }).join(', ')
                        : val;
                    if (!hasRenderableValue(displayValue)) {
                        return;
                    }
                    html += '<div class="col-right avoid-break">\n<div class="meta">\n<span class="C1"><strong>' + label + '</strong></span><span class="C2">&nbsp;</span><span class="title C3">' + displayValue + '</span>\n</div>\n</div>';
                });
            }
            html += '</div></div>';
            return html;
        }

        html += '<div class="col-right" id="' + key + '">';
        if (key === 'skills') {
            html += renderSkills(value);
        } else if (normalizedKey === 'products' && Array.isArray(value)) {
            html += value.map(function (item, idx) { return renderProduct(item, idx); }).join('');
        } else if (key === 'prior_art' && Array.isArray(value)) {
            html += value.map(function (item, idx) { return renderPriorArt(item, idx); }).join('');
        } else if (Array.isArray(value)) {
            html += value.map(function (item, idx) { return renderGenericItem(key, item, idx); }).join('');
        } else if (typeof value === 'object' && value !== null) {
            html += renderGenericObjectFallback(key, value);
        }
        html += '</div></div>';
        return html;
    }

    function renderGenericObjectFallback(key, obj) {
        let html = '';
        Object.entries(obj).forEach(function (entry) {
            const label = entry[0];
            const val = entry[1];
            if (!hasRenderableValue(val)) {
                return;
            }
            const displayValue = Array.isArray(val)
                ? filterSkillPlaceholders(val).filter(function (item) { return hasRenderableValue(item); }).join(', ')
                : val;
            if (!hasRenderableValue(displayValue)) {
                return;
            }
            html += '<div class="col-right avoid-break">\n<div class="meta">\n<span class="C1"><strong>' + label.replace(/_/g, ' ').replace(/\b\w/g, function (c) { return c.toUpperCase(); }) + '</strong></span><span class="C2">&nbsp;</span><span class="title C3">' + displayValue + '</span>\n</div>\n</div>';
        });
        return html;
    }

    function renderProduct(item, idx) {
        if (!item || typeof item !== 'object') {
            return '';
        }
        const name = item.name || '';
        const url = item.url || '';
        const role = item.role || '';
        const positioning = item.positioning || item.one_liner || '';
        const dates = item.dates || item.duration || '';
        const status = item.status || '';
        const description = item.description || '';
        const facts = Array.isArray(item.facts) ? item.facts.filter(function (f) { return hasRenderableValue(f); }) : [];
        const stack = filterSkillPlaceholders(Array.isArray(item.stack) ? item.stack : []);

        let nameHtml = name;
        if (hasRenderableValue(name) && hasRenderableValue(url)) {
            nameHtml = '<a href="' + url + '" target="_blank" rel="noopener noreferrer">' + name + '</a>';
        }

        let html = '<div class="col-right avoid-break section-separator product-item c' + (idx + 1) + '">';
        html += '<div class="meta">';
        if (hasRenderableValue(dates)) {
            html += '<span class="dates fr"><em>' + dates + '</em></span>';
        }
        html += '<span class="C1"><strong>' + nameHtml + '</strong></span>';
        if (hasRenderableValue(role)) {
            html += '<span class="C2">&nbsp;</span><span class="title C3-A">' + role + '</span>';
        }
        html += '</div>';

        if (hasRenderableValue(positioning)) {
            html += '<div class="product-positioning">' + positioning + '</div>';
        }
        if (hasRenderableValue(status)) {
            html += '<div class="product-status">' + status + '</div>';
        }
        if (stack.length > 0) {
            html += '<div class="product-stack"><strong>Stack:</strong> ' + stack.join(', ') + '</div>';
        }
        if (facts.length > 0) {
            html += '<ul class="product-facts">';
            facts.forEach(function (fact) {
                html += '<li>' + fact + '</li>';
            });
            html += '</ul>';
        }
        if (hasRenderableValue(description)) {
            html += '<div class="description"><p>' + description + '</p></div>';
        }
        html += '</div>';
        return html;
    }

    function renderPriorArt(item, idx) {
        if (!item || typeof item !== 'object') {
            return '';
        }
        const title = item.title || '';
        const url = item.url || '';
        const description = item.description || item.details || '';
        const organization = item.organization || item.source || '';
        const date = item.date || '';

        let titleHtml = title;
        if (hasRenderableValue(title) && hasRenderableValue(url)) {
            titleHtml = '<a href="' + url + '" target="_blank" rel="noopener noreferrer">' + title + '</a>';
        }

        let html = '<div class="col-right avoid-break section-separator prior-art-item c' + (idx + 1) + '">';
        html += '<div class="meta">';
        if (hasRenderableValue(date)) {
            html += '<span class="dates fr"><em>' + date + '</em></span>';
        }
        html += '<span class="C1"><strong>' + titleHtml + '</strong></span>';
        if (hasRenderableValue(organization)) {
            html += '<span class="C2">&nbsp;</span><span class="title C3">' + organization + '</span>';
        }
        html += '</div>';
        if (hasRenderableValue(description)) {
            html += '<div class="description"><p>' + description + '</p></div>';
        }
        html += '</div>';
        return html;
    }

    function renderGenericItem(key, item, idx) {
        if (key === 'skills') {
            return '';
        }
        if (typeof item === 'object' && item !== null) {
            if (key.toLowerCase().includes('experience') || (item.role && (item.company || item.organization))) {
                const company = item.company || item.organization || '';
                const dates = item.dates || item.duration || '';
                const skillsArr = Array.isArray(item.skills_used) ? filterSkillPlaceholders(item.skills_used) : [];
                const skills = skillsArr.length > 0 ? skillsArr.join(', ') : (hasRenderableValue(item.skills_used) ? item.skills_used : '');
                let domain = item.domain;
                if (Array.isArray(domain)) {
                    domain = domain.join(', ');
                }
                if (!hasRenderableValue(domain)) {
                    domain = '';
                }
                const workMode = item.work_mode || '';

                let detailsHtml = '<div class="exp-details">';
                if (hasRenderableValue(domain)) {
                    detailsHtml += '<span class="domain">Domain:<span class="domain-content"> ' + domain + '</span></span>';
                }
                if (hasRenderableValue(workMode)) {
                    detailsHtml += '<span class="work-mode">' + workMode + '</span>';
                }
                detailsHtml += '</div>';

                let skillsHtml = '';
                if (hasRenderableValue(skills)) {
                    skillsHtml = '<span class="skills-used"><strong>Skills used:</strong> ' + skills + '</span>';
                }

                return '<div class="col-right avoid-break section-separator">' +
                    '<div class="meta">' +
                    '<div class="exp-header">' +
                    '<span class="dates fr"><em>' + dates + '</em></span>' +
                    '<strong><span class="C1">' + (item.role || '') + '</span></strong><span class="C2">&nbsp;</span><span class="title C3-A">' + company + '</span>' +
                    '</div>' +
                    detailsHtml +
                    skillsHtml +
                    '</div>' +
                    '<div class="description">' +
                    '<p>' + (item.description || '') + '</p>' +
                    '</div>' +
                    '</div>';
            }

            if (key.toLowerCase().includes('education') || (item.degree && (item.institution || item.school))) {
                const dates = item.dates || item.duration || '';
                let details = '';
                if (typeof item.institution === 'string') {
                    details = (item.course ? item.course + ' <br> ' : '') + item.institution;
                } else if (typeof item.institution === 'object' && item.institution !== null) {
                    details = (item.institution.course ? item.institution.course + ' <br> ' : '') + (item.institution.school || '');
                } else {
                    details = item.course || item.school || '';
                }
                return '<div class="col-right avoid-break section-separator c' + (idx + 1) + '">' +
                    '<div class="meta">' +
                    '<span class="dates fr"><em>' + dates + '</em></span>' +
                    '<span class="C1"><strong>' + (item.degree || '') + '</strong></span><span class="C2">&nbsp;</span><span class="title C3">' + details + '</span>' +
                    '</div>' +
                    '</div>';
            }

            if (key.toLowerCase().includes('recognition') || (item.title && (item.description || item.details) && item.date)) {
                const details = (item.description || item.details || '') + (item.organization ? ' <br> ' + item.organization : '');
                return '<div class="col-right avoid-break section-separator c' + (idx + 1) + '">' +
                    '<div class="meta">' +
                    '<span class="dates fr"><em>' + (item.date || '') + '</em></span>' +
                    '<span class="C1"><strong>' + (item.title || '') + '</strong></span><span class="C2">&nbsp;</span><span class="title C3">' + details + '</span><br>' +
                    '</div>' +
                    '</div>';
            }

            if (item.title && (item.link || item.url)) {
                const link = item.link || item.url;
                const linkText = item.link_text || item.caption || link;
                return '<div class="col-right avoid-break section-separator portfolio-item">' +
                    '<div class="meta">' +
                    (item.date ? '<span class="dates fr"><em>' + item.date + '</em></span>' : '') +
                    '<span class="C1"><strong>' + (item.title || '') + '</strong></span><span class="C2">&nbsp;</span><span class="title C3 portfolio-link">' +
                    (link ? '<a href="' + link + '" target="_blank" rel="noopener noreferrer">' + linkText + '</a>' : '') +
                    '</span>' +
                    '</div>' +
                    '</div>';
            }

            if (key.toLowerCase().includes('persona') || (item.label && item.value)) {
                if (!hasRenderableValue(item.label) && !hasRenderableValue(item.value)) {
                    return '';
                }
                return '<div class="col-right avoid-break">' +
                    '<div class="meta">' +
                    '<span class="C1"><strong>' + (item.label || '') + '</strong></span><span class="C2">&nbsp;</span><span class="title C3">' + (item.value || '') + '</span>' +
                    '</div>' +
                    '</div>';
            }
        }
        return '<div class="col-right avoid-break section-separator"><pre>' + JSON.stringify(item, null, 2) + '</pre></div>';
    }

    function renderSkills(skills) {
        let html = '<ul class="col-right skills-list">';
        for (const category of Object.keys(skills)) {
            const items = filterSkillPlaceholders(skills[category]);
            if (items.length > 0) {
                html += '<li class="skills-list-item">' +
                    '<span class="C1"><strong>' + category + ':</strong></span>' +
                    '<span class="C2">&nbsp;</span>' +
                    '<span class="C3">' + items.join(', ') + '</span>' +
                    '</li>';
            }
        }
        html += '</ul>';
        return html;
    }

    function renderExperience(exp, idx) {
        return '<div class="col-right avoid-break section-separator">' +
            '<div class="meta">' +
            '<div class="exp-header">' +
            '<span class="dates fr"><em>' + (exp.dates || '') + '</em></span>' +
            '<strong><span class="C1">' + (exp.role || '') + '</span></strong><span class="C2">&nbsp;</span><span class="title C3-A">' + (exp.company || '') + '</span>' +
            '</div>' +
            '<div class="exp-details">' +
            '<span class="domain">Domain:<span class="domain-content"> ' + (exp.domain || '') + '</span></span>' +
            '<span class="work-mode">' + (exp.work_mode || '') + '</span>' +
            '</div>' +
            '<span class="skills-used"><strong>Skills used:</strong> ' + (exp.skills_used || '') + '</span>' +
            '</div>' +
            '<div class="description">' +
            '<p>' + (exp.description || '') + '</p>' +
            '</div>' +
            '</div>';
    }

    function renderRecognition(rec, idx) {
        return '<div class="col-right avoid-break section-separator c' + (idx + 1) + '">' +
            '<div class="meta">' +
            '<span class="dates fr"><em>' + (rec.date || '') + '</em></span>' +
            '<span class="C1"><strong>' + (rec.title || '') + '</strong></span><span class="C2">&nbsp;</span><span class="title C3">' + (rec.details || '') + '</span><br>' +
            '</div>' +
            '</div>';
    }

    function renderPortfolio(item, idx) {
        return '<div class="col-right avoid-break section-separator portfolio-item">' +
            '<div class="meta">' +
            (item.date ? '<span class="dates fr"><em>' + item.date + '</em></span>' : '') +
            '<span class="C1"><strong>' + (item.title || '') + '</strong></span><span class="C2">&nbsp;</span><span class="title C3 portfolio-link">' +
            (item.link ? '<a href="' + item.link + '" target="_blank" rel="noopener noreferrer">' + (item.link_text || item.link) + '</a>' : '') +
            '</span>' +
            '</div>' +
            '</div>';
    }

    function renderEducation(edu, idx) {
        return '<div class="col-right avoid-break section-separator c' + (idx + 1) + '">' +
            '<div class="meta">' +
            '<span class="dates fr"><em>' + (edu.dates || '') + '</em></span>' +
            '<span class="C1"><strong>' + (edu.degree || '') + '</strong></span><span class="C2">&nbsp;</span><span class="title C3">' + (edu.details || '') + '</span>' +
            '</div>' +
            '</div>';
    }

    function renderPersona(item, idx) {
        return '<div class="col-right avoid-break">' +
            '<div class="meta">' +
            '<span class="C1"><strong>' + (item.label || '') + '</strong></span><span class="C2">&nbsp;</span><span class="title C3">' + (item.value || '') + '</span>' +
            '</div>' +
            '</div>';
    }
})();

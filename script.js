document.addEventListener('DOMContentLoaded', function() {
    // Load the data.json.js script dynamically if not already loaded
    if (typeof window.resumeData === 'undefined') {
        const script = document.createElement('script');
        script.src = './data.json.js';
        script.onload = renderResume;
        document.head.appendChild(script);
    } else {
        renderResume();
    }

    function setIfExists(id, fn) {
        const el = document.getElementById(id);
        if (el) fn(el);
    }

    function renderResume() {
        const data = window.resumeData;
        setIfExists('page-title', el => el.textContent = data.name + ' - Résumé');
        setIfExists('name', el => el.textContent = data.name);
        setIfExists('summary', el => {
            let summary = data.summary;
            let items = [];
            if (Array.isArray(summary)) {
                items = summary;
            } else if (typeof summary === 'string') {
                items = summary.split(/[.\n]/).map(s => s.trim()).filter(Boolean);
            }
            if (items.length > 0) {
                el.innerHTML = '<ul class="summary-list">' + items.map(item => `<li>${item}</li>`).join('') + '</ul>';
            } else {
                el.textContent = summary;
            }
        });

        // Intro (top-right)
        const introSection = document.querySelector('.top-right');
        if (introSection && data.intro) {
            introSection.innerHTML = `
                <div class="designation">${data.intro.designation}</div>
                <div class="experience-years">${data.intro.experience}</div>
            `;
        }

        // --- DYNAMIC SECTION RENDERING ---
        const dynamicSections = document.getElementById('dynamic-sections');
        if (dynamicSections) {
            let allSectionsHtml = '';
            // Only render keys that are objects/arrays and not primitives, in the order encountered in JSON
            const skipKeys = new Set(['name', 'location', 'phone', 'email', 'summary', 'intro']);
            Object.keys(data).forEach((key) => {
                if (skipKeys.has(key)) return;
                const value = data[key];
                if (typeof value !== 'object' || value === null) return;
                let sectionHtml = renderSection(key, value, data);
                allSectionsHtml += sectionHtml;
            });
            // Add print-bottom-border to last section
            const temp = document.createElement('div');
            temp.innerHTML = allSectionsHtml;
            if (temp.lastElementChild) temp.lastElementChild.classList.add('print-bottom-border');
            // Replace dynamic-sections with the new sections and remove the container
            const parent = dynamicSections.parentNode;
            while (temp.firstChild) {
                parent.insertBefore(temp.firstChild, dynamicSections);
            }
            parent.removeChild(dynamicSections);
        }
        // --- END DYNAMIC SECTION RENDERING ---
    }

    // --- Section renderers ---
    function renderSection(key, value, data) {
        // Section title: prettify key only
        let title = key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
        let html = `<div class="col-full${key === 'contact-info' || key === 'contact_info' ? ' avoid-break' : ''}">`;
        html += `<div class="col-left"><h2>${title}</h2></div>`;
        // Special handling for persona: wrap all items in a single col-right, each as col-right avoid-break
        if (key.toLowerCase().includes('persona')) {
            html += `<div class="col-right" id="${key}">`;
            if (Array.isArray(value)) {
                value.forEach((item, idx) => {
                    html += `<div class=\"col-right avoid-break\">\n<div class=\"meta\">\n<span class=\"C1\"><strong>${item.label || ''}</strong></span><span class=\"C2\">&nbsp;</span><span class=\"title C3\">${item.value || ''}</span>\n</div>\n</div>`;
                });
            } else if (typeof value === 'object' && value !== null) {
                // If persona is an object, render each key-value as a persona item
                Object.entries(value).forEach(([label, val]) => {
                    html += `<div class=\"col-right avoid-break\">\n<div class=\"meta\">\n<span class=\"C1\"><strong>${label}</strong></span><span class=\"C2\">&nbsp;</span><span class=\"title C3\">${Array.isArray(val) ? val.join(', ') : val}</span>\n</div>\n</div>`;
                });
            }
            html += `</div></div>`;
            return html;
        }
        html += `<div class="col-right" id="${key}">`;
        if (key === 'skills') {
            html += renderSkills(value);
        } else if (Array.isArray(value)) {
            html += value.map((item, idx) => renderGenericItem(key, item, idx)).join('');
        } else if (typeof value === 'object' && value !== null) {
            html += renderGenericObjectFallback(key, value);
        }
        html += `</div></div>`;
        return html;
    }

    // Fallback for rendering objects that are not arrays
    function renderGenericObjectFallback(key, obj) {
        let html = '';
        Object.entries(obj).forEach(([label, val]) => {
            html += `<div class=\"col-right avoid-break\">\n<div class=\"meta\">\n<span class=\"C1\"><strong>${label.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}</strong></span><span class=\"C2\">&nbsp;</span><span class=\"title C3\">${Array.isArray(val) ? val.join(', ') : val}</span>\n</div>\n</div>`;
        });
        return html;
    }

    function renderGenericItem(key, item, idx) {
        // Custom rendering for known keys, fallback to JSON
        if (key === 'skills') return '';
        if (typeof item === 'object' && item !== null) {
            // Experience: match by key or by structure
            if (key.toLowerCase().includes('experience') || (item.role && (item.company || item.organization))) {
                // Map organization -> company, duration -> dates, join arrays
                const company = item.company || item.organization || '';
                const dates = item.dates || item.duration || '';
                const skills = Array.isArray(item.skills_used) ? item.skills_used.join(', ') : (item.skills_used || '');
                let domain = item.domain;
                if (Array.isArray(domain)) domain = domain.join(', ');
                if (!domain) domain = '';
                const workMode = item.work_mode || '';
                return `<div class="col-right avoid-break section-separator">
                    <div class="meta">
                        <div class="exp-header">
                            <span class="dates fr"><em>${dates}</em></span>
                            <strong><span class="C1">${item.role || ''}</span></strong><span class="C2">&nbsp;</span><span class="title C3-A">${company}</span>
                        </div>
                        <div class="exp-details">
                            <span class="domain">Domain:<span class="domain-content"> ${domain}</span></span>
                            <span class="work-mode">${workMode}</span>
                        </div>
                        <span class="skills-used"><strong>Skills used:</strong> ${skills}</span>
                    </div>
                    <div class="description">
                        <p>${item.description || ''}</p>
                    </div>
                </div>`;
            }
            // Education: match by key or by structure
            if (key.toLowerCase().includes('education') || (item.degree && (item.institution || item.school))) {
                // Map duration -> dates, support institution as string or object
                const dates = item.dates || item.duration || '';
                let details = '';
                if (typeof item.institution === 'string') {
                    details = (item.course ? item.course + ' <br> ' : '') + item.institution;
                } else if (typeof item.institution === 'object' && item.institution !== null) {
                    details = (item.institution.course ? item.institution.course + ' <br> ' : '') + (item.institution.school || '');
                } else {
                    details = item.course || '';
                }
                return `<div class="col-right avoid-break section-separator c${idx+1}">
                    <div class="meta">
                        <span class="dates fr"><em>${dates}</em></span>
                        <span class="C1"><strong>${item.degree || ''}</strong></span><span class="C2">&nbsp;</span><span class="title C3">${details}</span>
                    </div>
                </div>`;
            }
            // Recognitions: match by key or by structure
            if (key.toLowerCase().includes('recognition') || (item.title && (item.description || item.details) && item.date)) {
                // Map description/details, organization
                const details = (item.description || item.details || '') + (item.organization ? ' <br> ' + item.organization : '');
                return `<div class="col-right avoid-break section-separator c${idx+1}">
                    <div class="meta">
                        <span class="dates fr"><em>${item.date ? item.date : ''}</em></span>
                        <span class="C1"><strong>${item.title ? item.title : ''}</strong></span><span class="C2">&nbsp;</span><span class="title C3">${details}</span><br>
                    </div>
                </div>`;
            }
            // Portfolio: support both {title, link} and {title, url, caption}
            if (item.title && (item.link || item.url)) {
                const link = item.link || item.url;
                const linkText = item.link_text || item.caption || link;
                return `<div class="col-right avoid-break section-separator portfolio-item">
                    <div class="meta">
                        ${item.date ? `<span class="dates fr"><em>${item.date}</em></span>` : ''}
                        <span class="C1"><strong>${item.title || ''}</strong></span><span class="C2">&nbsp;</span><span class="title C3 portfolio-link">${link ? `<a href="${link}" target="_blank">${linkText}</a>` : ''}</span>
                    </div>
                </div>`;
            }
            // Persona: support {label, value} and render as original
            if ((key.toLowerCase().includes('persona') || (item.label && item.value))) {
                return `<div class="col-right avoid-break">
                    <div class="meta">
                        <span class="C1"><strong>${item.label ? item.label : ''}</strong></span><span class="C2">&nbsp;</span><span class="title C3">${item.value ? item.value : ''}</span>
                    </div>
                </div>`;
            }
        }
        // Fallback: pretty print object
        return `<div class="col-right avoid-break section-separator"><pre>${JSON.stringify(item, null, 2)}</pre></div>`;
    }

    function renderSkills(skills) {
        let html = '<ul class="col-right skills-list">';
        for (const [category, items] of Object.entries(skills)) {
            if (items.length > 0) {
                html += `<li class="skills-list-item">
                    <span class="C1"><strong>${category}:</strong></span>
                    <span class="C2">&nbsp;</span>
                    <span class="C3">${items.join(', ')}</span>
                </li>`;
            }
        }
        html += '</ul>';
        return html;
    }

    function renderExperience(exp, idx) {
        return `<div class="col-right avoid-break section-separator">
            <div class="meta">
                <div class="exp-header">
                    <span class="dates fr"><em>${exp.dates || ''}</em></span>
                    <strong><span class="C1">${exp.role || ''}</span></strong><span class="C2">&nbsp;</span><span class="title C3-A">${exp.company || ''}</span>
                </div>
                <div class="exp-details">
                    <span class="domain">Domain:<span class="domain-content"> ${exp.domain || ''}</span></span>
                    <span class="work-mode">${exp.work_mode || ''}</span>
                </div>
                <span class="skills-used"><strong>Skills used:</strong> ${exp.skills_used || ''}</span>
            </div>
            <div class="description">
                <p>${exp.description || ''}</p>
            </div>
        </div>`;
    }

    function renderRecognition(rec, idx) {
        return `<div class="col-right avoid-break section-separator c${idx+1}">
            <div class="meta">
                <span class="dates fr"><em>${rec.date || ''}</em></span>
                <span class="C1"><strong>${rec.title || ''}</strong></span><span class="C2">&nbsp;</span><span class="title C3">${rec.details || ''}</span><br>
            </div>
        </div>`;
    }

    function renderPortfolio(item, idx) {
        return `<div class="col-right avoid-break section-separator portfolio-item">
            <div class="meta">
                ${item.date ? `<span class="dates fr"><em>${item.date}</em></span>` : ''}
                <span class="C1"><strong>${item.title || ''}</strong></span><span class="C2">&nbsp;</span><span class="title C3 portfolio-link">${item.link ? `<a href="${item.link}" target="_blank">${item.link_text || item.link}</a>` : ''}</span>
            </div>
        </div>`;
    }

    function renderEducation(edu, idx) {
        return `<div class="col-right avoid-break section-separator c${idx+1}">
            <div class="meta">
                <span class="dates fr"><em>${edu.dates || ''}</em></span>
                <span class="C1"><strong>${edu.degree || ''}</strong></span><span class="C2">&nbsp;</span><span class="title C3">${edu.details || ''}</span>
            </div>
        </div>`;
    }

    function renderPersona(item, idx) {
        return `<div class="col-right avoid-break">
            <div class="meta">
                <span class="C1"><strong>${item.label || ''}</strong></span><span class="C2">&nbsp;</span><span class="title C3">${item.value || ''}</span>
            </div>
        </div>`;
    }
});

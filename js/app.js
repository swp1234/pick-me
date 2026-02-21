/* ========================================
   Pick Me Test - App Logic
   12 scenario-based questions
   Score 0-3 per question, tier by total
   ======================================== */

(function() {
    'use strict';

    // --- i18n helpers (try-catch) ---
    function getI18n() {
        try {
            if (typeof i18n !== 'undefined' && i18n) return i18n;
        } catch (e) { /* ignore */ }
        return null;
    }

    function t(key, fallback) {
        try {
            var inst = getI18n();
            if (inst && typeof inst.t === 'function') {
                var val = inst.t(key);
                if (val && val !== key) return val;
            }
        } catch (e) { /* ignore */ }
        return fallback || key;
    }

    function fmt(template, values) {
        var result = template;
        for (var k in values) {
            if (values.hasOwnProperty(k)) {
                result = result.replace(new RegExp('\\{' + k + '\\}', 'g'), values[k]);
            }
        }
        return result;
    }

    function $(id) { return document.getElementById(id); }

    // --- Questions data ---
    // Each question: scenario emoji, i18n key prefix, 4 options with pick-me scores (0-3)
    var questions = [
        {
            key: 'q1',
            emoji: '\uD83C\uDF7D\uFE0F',
            options: [
                { key: 'a', points: 0 },
                { key: 'b', points: 1 },
                { key: 'c', points: 2 },
                { key: 'd', points: 3 }
            ]
        },
        {
            key: 'q2',
            emoji: '\uD83D\uDC57',
            options: [
                { key: 'a', points: 0 },
                { key: 'b', points: 1 },
                { key: 'c', points: 2 },
                { key: 'd', points: 3 }
            ]
        },
        {
            key: 'q3',
            emoji: '\uD83C\uDF89',
            options: [
                { key: 'a', points: 0 },
                { key: 'b', points: 1 },
                { key: 'c', points: 2 },
                { key: 'd', points: 3 }
            ]
        },
        {
            key: 'q4',
            emoji: '\uD83C\uDFA8',
            options: [
                { key: 'a', points: 0 },
                { key: 'b', points: 1 },
                { key: 'c', points: 2 },
                { key: 'd', points: 3 }
            ]
        },
        {
            key: 'q5',
            emoji: '\uD83D\uDCF8',
            options: [
                { key: 'a', points: 0 },
                { key: 'b', points: 1 },
                { key: 'c', points: 2 },
                { key: 'd', points: 3 }
            ]
        },
        {
            key: 'q6',
            emoji: '\uD83D\uDCAC',
            options: [
                { key: 'a', points: 0 },
                { key: 'b', points: 1 },
                { key: 'c', points: 2 },
                { key: 'd', points: 3 }
            ]
        },
        {
            key: 'q7',
            emoji: '\uD83D\uDE02',
            options: [
                { key: 'a', points: 0 },
                { key: 'b', points: 1 },
                { key: 'c', points: 2 },
                { key: 'd', points: 3 }
            ]
        },
        {
            key: 'q8',
            emoji: '\uD83D\uDCF1',
            options: [
                { key: 'a', points: 0 },
                { key: 'b', points: 1 },
                { key: 'c', points: 2 },
                { key: 'd', points: 3 }
            ]
        },
        {
            key: 'q9',
            emoji: '\uD83C\uDFC6',
            options: [
                { key: 'a', points: 0 },
                { key: 'b', points: 1 },
                { key: 'c', points: 2 },
                { key: 'd', points: 3 }
            ]
        },
        {
            key: 'q10',
            emoji: '\uD83E\uDD14',
            options: [
                { key: 'a', points: 0 },
                { key: 'b', points: 1 },
                { key: 'c', points: 2 },
                { key: 'd', points: 3 }
            ]
        },
        {
            key: 'q11',
            emoji: '\u2764\uFE0F',
            options: [
                { key: 'a', points: 0 },
                { key: 'b', points: 1 },
                { key: 'c', points: 2 },
                { key: 'd', points: 3 }
            ]
        },
        {
            key: 'q12',
            emoji: '\uD83C\uDFAD',
            options: [
                { key: 'a', points: 0 },
                { key: 'b', points: 1 },
                { key: 'c', points: 2 },
                { key: 'd', points: 3 }
            ]
        }
    ];

    // --- Tier definitions (score 0-36) ---
    var tiers = [
        { key: 'secure',    emoji: '\uD83D\uDC51', color: '#22c55e', min: 0,  max: 7 },
        { key: 'chill',     emoji: '\uD83D\uDE0E', color: '#3b82f6', min: 8,  max: 14 },
        { key: 'mild',      emoji: '\uD83D\uDE48', color: '#eab308', min: 15, max: 21 },
        { key: 'certified', emoji: '\uD83D\uDE4B', color: '#f97316', min: 22, max: 28 },
        { key: 'ultimate',  emoji: '\uD83D\uDC85', color: '#ef4444', min: 29, max: 36 }
    ];

    // --- State ---
    var currentQuestion = 0;
    var totalScore = 0;
    var answers = [];
    var isTransitioning = false;

    // --- DOM caching ---
    var startScreen = $('startScreen');
    var quizScreen = $('quizScreen');
    var resultScreen = $('resultScreen');
    var startBtn = $('startBtn');
    var progressFill = $('progressFill');
    var progressText = $('progressText');
    var pickmeValue = $('pickmeValue');
    var scenarioEmoji = $('scenarioEmoji');
    var questionText = $('questionText');
    var optionsContainer = $('optionsContainer');
    var questionCard = $('questionCard');
    var tierBadge = $('tierBadge');
    var pickmeMeterFill = $('pickmeMeterFill');
    var pickmeMeterGlow = $('pickmeMeterGlow');
    var pickmeScoreDisplay = $('pickmeScoreDisplay');
    var tierName = $('tierName');
    var tierDesc = $('tierDesc');
    var breakdownList = $('breakdownList');
    var retakeBtn = $('retakeBtn');
    var shareTwitterBtn = $('shareTwitter');
    var shareCopyBtn = $('shareCopy');
    var themeToggle = $('themeToggle');
    var themeIcon = $('themeIcon');
    var langBtn = $('langBtn');
    var langDropdown = $('langDropdown');
    var currentLangLabel = $('currentLang');

    // --- Language name map ---
    var langNames = {
        ko: '\uD55C\uAD6D\uC5B4', en: 'English', zh: '\u4E2D\u6587',
        hi: '\u0939\u093F\u0928\u094D\u0926\u0940', ru: '\u0420\u0443\u0441\u0441\u043A\u0438\u0439',
        ja: '\u65E5\u672C\u8A9E', es: 'Espa\u00F1ol', pt: 'Portugu\u00EAs',
        id: 'Indonesia', tr: 'T\u00FCrk\u00E7e', de: 'Deutsch', fr: 'Fran\u00E7ais'
    };

    // --- Get tier from score ---
    function getTier(score) {
        for (var i = tiers.length - 1; i >= 0; i--) {
            if (score >= tiers[i].min) return tiers[i];
        }
        return tiers[0];
    }

    // --- Calculate percentage (0-36 -> 0-100) ---
    function getPercent(score) {
        return Math.round((score / 36) * 100);
    }

    // --- Get pick-me level label ---
    function getPointLabel(points) {
        if (points === 0) return 'low';
        if (points === 1) return 'low';
        if (points === 2) return 'medium';
        return 'high';
    }

    // --- Screen management ---
    function showScreen(screen) {
        startScreen.style.display = 'none';
        quizScreen.style.display = 'none';
        resultScreen.style.display = 'none';
        startScreen.classList.remove('active');
        quizScreen.classList.remove('active');
        resultScreen.classList.remove('active');
        screen.style.display = '';
        screen.classList.add('active');
        window.scrollTo({ top: 0, behavior: 'smooth' });
    }

    // --- Theme toggle ---
    function initTheme() {
        var saved = localStorage.getItem('theme');
        if (saved) {
            document.documentElement.setAttribute('data-theme', saved);
        }
        updateThemeIcon();
    }

    function updateThemeIcon() {
        var current = document.documentElement.getAttribute('data-theme');
        if (themeIcon) {
            themeIcon.textContent = current === 'light' ? '\uD83C\uDF19' : '\u2600\uFE0F';
        }
    }

    if (themeToggle) {
        themeToggle.addEventListener('click', function() {
            var current = document.documentElement.getAttribute('data-theme');
            var next = current === 'light' ? 'dark' : 'light';
            document.documentElement.setAttribute('data-theme', next);
            localStorage.setItem('theme', next);
            updateThemeIcon();
        });
    }

    // --- Language selector ---
    function initLangSelector() {
        if (!langBtn || !langDropdown) return;

        langBtn.addEventListener('click', function(e) {
            e.stopPropagation();
            langDropdown.classList.toggle('active');
        });

        document.addEventListener('click', function(e) {
            if (!langDropdown.contains(e.target) && e.target !== langBtn) {
                langDropdown.classList.remove('active');
            }
        });

        var langOptions = langDropdown.querySelectorAll('.lang-option');
        langOptions.forEach(function(option) {
            option.addEventListener('click', function() {
                var lang = this.getAttribute('data-lang');
                langDropdown.classList.remove('active');

                var inst = getI18n();
                if (inst && typeof inst.setLanguage === 'function') {
                    inst.setLanguage(lang).then(function() {
                        if (currentLangLabel) {
                            currentLangLabel.textContent = langNames[lang] || lang;
                        }
                        refreshCurrentView();
                    }).catch(function() {});
                }
            });
        });

        // Set initial label
        var inst = getI18n();
        if (inst && currentLangLabel) {
            currentLangLabel.textContent = langNames[inst.currentLang] || inst.currentLang;
        }
    }

    // --- Refresh current view after language change ---
    function refreshCurrentView() {
        if (quizScreen.classList.contains('active')) {
            renderQuestion();
            pickmeValue.textContent = getPercent(totalScore) + '%';
        } else if (resultScreen.classList.contains('active')) {
            renderResult();
        }
    }

    // --- Start quiz ---
    function startQuiz() {
        currentQuestion = 0;
        totalScore = 0;
        answers = [];
        isTransitioning = false;
        pickmeValue.textContent = '0%';
        showScreen(quizScreen);
        renderQuestion();

        if (typeof gtag === 'function') {
            gtag('event', 'quiz_start', { event_category: 'pick-me' });
        }
    }

    // --- Render question ---
    function renderQuestion() {
        var q = questions[currentQuestion];
        var qNum = currentQuestion + 1;
        var total = questions.length;

        // Update progress
        var pct = (currentQuestion / total) * 100;
        progressFill.style.width = pct + '%';
        progressText.textContent = qNum + ' / ' + total;

        // Scenario emoji
        scenarioEmoji.textContent = q.emoji;

        // Question text via i18n
        questionText.textContent = t('questions.' + q.key + '.text', 'Question ' + qNum);

        // Render options
        optionsContainer.innerHTML = '';
        optionsContainer.classList.remove('answered');
        q.options.forEach(function(opt, idx) {
            var btn = document.createElement('button');
            btn.className = 'option-btn';
            btn.textContent = t('questions.' + q.key + '.' + opt.key, 'Option ' + (idx + 1));
            btn.addEventListener('click', function() {
                if (!isTransitioning) {
                    selectOption(idx);
                }
            });
            optionsContainer.appendChild(btn);
        });
    }

    // --- Select option ---
    function selectOption(index) {
        if (isTransitioning) return;
        isTransitioning = true;

        var q = questions[currentQuestion];
        var opt = q.options[index];
        var points = opt.points;

        // Store answer
        answers.push({
            questionIndex: currentQuestion,
            optionIndex: index,
            points: points
        });

        // Update total
        totalScore += points;

        // Determine selection visual class
        var level = getPointLabel(points);
        var selClass = 'selected-' + level;

        // Visual feedback on selected button
        var buttons = optionsContainer.querySelectorAll('.option-btn');
        optionsContainer.classList.add('answered');
        buttons.forEach(function(btn, i) {
            btn.disabled = true;
            if (i === index) {
                btn.classList.add(selClass);
            }
        });

        // Show floating indicator
        showFloatingPoints(points, buttons[index]);

        // Update live percentage
        pickmeValue.textContent = getPercent(totalScore) + '%';
        pickmeValue.classList.add('bump');
        setTimeout(function() {
            pickmeValue.classList.remove('bump');
        }, 400);

        // Advance after delay
        setTimeout(function() {
            if (currentQuestion < questions.length - 1) {
                currentQuestion++;
                // Slide transition on question card
                if (questionCard) {
                    questionCard.style.opacity = '0';
                    questionCard.style.transform = 'translateX(-30px)';
                    setTimeout(function() {
                        renderQuestion();
                        questionCard.style.opacity = '';
                        questionCard.style.transform = '';
                        isTransitioning = false;
                    }, 300);
                } else {
                    renderQuestion();
                    isTransitioning = false;
                }
            } else {
                // Quiz complete
                progressFill.style.width = '100%';
                showScreen(resultScreen);
                renderResult();
                isTransitioning = false;
            }
        }, 800);
    }

    // --- Floating points indicator ---
    function showFloatingPoints(points, targetBtn) {
        var floater = document.createElement('div');
        floater.className = 'floating-points';
        var level = getPointLabel(points);
        floater.classList.add(level);

        if (points === 0) {
            floater.textContent = t('quiz.secure', 'Secure!');
        } else if (points === 1) {
            floater.textContent = '+' + points;
        } else if (points === 2) {
            floater.textContent = '+' + points;
        } else {
            floater.textContent = '+' + points + ' \uD83D\uDE4B';
        }

        if (targetBtn && targetBtn.parentNode) {
            targetBtn.style.position = 'relative';
            floater.style.position = 'absolute';
            floater.style.top = '-10px';
            floater.style.right = '10px';
            floater.style.pointerEvents = 'none';
            targetBtn.appendChild(floater);
        } else {
            document.body.appendChild(floater);
        }

        setTimeout(function() {
            if (floater.parentNode) {
                floater.parentNode.removeChild(floater);
            }
        }, 1000);
    }

    // --- Animate score count ---
    function animateCount(element, from, to, suffix) {
        var duration = 600;
        var startTime = null;
        var diff = to - from;
        suffix = suffix || '';

        function step(timestamp) {
            if (!startTime) startTime = timestamp;
            var elapsed = timestamp - startTime;
            var progress = Math.min(elapsed / duration, 1);
            // Ease out cubic
            var eased = 1 - Math.pow(1 - progress, 3);
            var current = Math.round(from + diff * eased);
            element.textContent = current + suffix;
            if (progress < 1) {
                requestAnimationFrame(step);
            }
        }

        requestAnimationFrame(step);
    }

    // --- Render result ---
    function renderResult() {
        var tier = getTier(totalScore);
        var pct = getPercent(totalScore);
        var resultCard = resultScreen.querySelector('.result-card');

        // Clear old tier classes
        var tierClasses = ['tier-secure', 'tier-chill', 'tier-mild', 'tier-certified', 'tier-ultimate'];
        tierClasses.forEach(function(cls) {
            resultCard.classList.remove(cls);
        });
        resultCard.classList.add('tier-' + tier.key);

        // Tier badge
        tierBadge.textContent = tier.emoji + ' ' + t('tiers.' + tier.key + '.name', tier.key);

        // Score display with animation
        pickmeScoreDisplay.textContent = '0%';
        setTimeout(function() {
            animateCount(pickmeScoreDisplay, 0, pct, '%');
        }, 300);

        // Meter fill animation
        if (pickmeMeterFill) {
            pickmeMeterFill.style.width = '0%';
        }

        setTimeout(function() {
            if (pickmeMeterFill) {
                pickmeMeterFill.style.width = pct + '%';
            }
        }, 500);

        // Tier name
        tierName.textContent = tier.emoji + ' ' + t('tiers.' + tier.key + '.name', tier.key);
        tierName.style.color = tier.color;

        // Tier description
        tierDesc.textContent = t('tiers.' + tier.key + '.desc', '');

        // Breakdown list
        renderBreakdown();

        // GA4 event
        if (typeof gtag === 'function') {
            gtag('event', 'quiz_complete', {
                event_category: 'pick-me',
                event_label: tier.key,
                value: totalScore
            });
        }
    }

    // --- Render breakdown ---
    function renderBreakdown() {
        breakdownList.innerHTML = '';

        answers.forEach(function(answer) {
            var q = questions[answer.questionIndex];
            var row = document.createElement('div');
            row.className = 'breakdown-item';

            var label = document.createElement('span');
            label.className = 'breakdown-scenario';
            label.textContent = q.emoji + ' ' + t('questions.' + q.key + '.text', 'Q' + (answer.questionIndex + 1));

            var pts = document.createElement('span');
            pts.className = 'breakdown-points';
            var level = getPointLabel(answer.points);
            pts.classList.add(level);
            pts.textContent = '+' + answer.points;

            row.appendChild(label);
            row.appendChild(pts);
            breakdownList.appendChild(row);
        });

        // Total row
        var totalRow = document.createElement('div');
        totalRow.className = 'breakdown-item';
        totalRow.style.borderColor = 'var(--primary)';
        totalRow.style.background = 'var(--primary-dim)';

        var totalLabel = document.createElement('span');
        totalLabel.className = 'breakdown-scenario';
        totalLabel.style.fontWeight = '700';
        totalLabel.textContent = t('result.total', 'Total');

        var totalPts = document.createElement('span');
        totalPts.className = 'breakdown-points';
        totalPts.style.color = getTier(totalScore).color;
        totalPts.style.fontSize = '1.1rem';
        totalPts.textContent = getPercent(totalScore) + '%';

        totalRow.appendChild(totalLabel);
        totalRow.appendChild(totalPts);
        breakdownList.appendChild(totalRow);
    }

    // --- Share: Twitter ---
    function shareTwitter() {
        var tier = getTier(totalScore);
        var tierLabel = t('tiers.' + tier.key + '.name', tier.key);
        var pct = getPercent(totalScore);
        var text = fmt(t('share.text', 'My Pick Me level is {score}%! I\'m "{tier}" \uD83D\uDE4B Find out yours:'), {
            score: pct,
            tier: tierLabel
        });
        var url = 'https://dopabrain.com/pick-me/';
        window.open(
            'https://twitter.com/intent/tweet?text=' + encodeURIComponent(text) + '&url=' + encodeURIComponent(url),
            '_blank',
            'noopener'
        );
        if (typeof gtag === 'function') {
            gtag('event', 'share', { method: 'twitter', content_type: 'quiz_result' });
        }
    }

    // --- Share: Copy URL ---
    function copyUrl() {
        var url = 'https://dopabrain.com/pick-me/';
        if (navigator.clipboard && navigator.clipboard.writeText) {
            navigator.clipboard.writeText(url).then(function() {
                showCopiedFeedback();
            }).catch(function() {
                fallbackCopy(url);
            });
        } else {
            fallbackCopy(url);
        }
        if (typeof gtag === 'function') {
            gtag('event', 'share', { method: 'copy', content_type: 'quiz_result' });
        }
    }

    function fallbackCopy(text) {
        var ta = document.createElement('textarea');
        ta.value = text;
        ta.style.position = 'fixed';
        ta.style.opacity = '0';
        document.body.appendChild(ta);
        ta.select();
        try { document.execCommand('copy'); showCopiedFeedback(); } catch (e) { /* ignore */ }
        document.body.removeChild(ta);
    }

    function showCopiedFeedback() {
        if (!shareCopyBtn) return;
        var original = shareCopyBtn.textContent;
        shareCopyBtn.textContent = t('share.copied', 'Copied!');
        shareCopyBtn.classList.add('copied');
        setTimeout(function() {
            shareCopyBtn.textContent = t('share.copyUrl', 'Copy Link');
            shareCopyBtn.classList.remove('copied');
        }, 2000);
    }

    // --- Hide loader ---
    function hideLoader() {
        var loader = $('app-loader');
        if (loader) {
            loader.classList.add('hidden');
        }
    }

    // --- Bind events ---
    function bindEvents() {
        if (startBtn) {
            startBtn.addEventListener('click', startQuiz);
        }

        if (retakeBtn) {
            retakeBtn.addEventListener('click', function() {
                showScreen(startScreen);
                // Reset meter
                if (pickmeMeterFill) pickmeMeterFill.style.width = '0%';
                if (pickmeScoreDisplay) pickmeScoreDisplay.textContent = '0%';
            });
        }

        if (shareTwitterBtn) {
            shareTwitterBtn.addEventListener('click', shareTwitter);
        }

        if (shareCopyBtn) {
            shareCopyBtn.addEventListener('click', copyUrl);
        }
    }

    // --- Init ---
    function init() {
        initTheme();
        initLangSelector();
        bindEvents();

        var inst = getI18n();
        if (inst && typeof inst.loadTranslations === 'function') {
            inst.loadTranslations(inst.currentLang).then(function() {
                if (typeof inst.updateUI === 'function') {
                    inst.updateUI();
                }
                // Update lang label
                if (currentLangLabel) {
                    currentLangLabel.textContent = langNames[inst.currentLang] || inst.currentLang;
                }
                hideLoader();
            }).catch(function() {
                hideLoader();
            });
        } else {
            hideLoader();
        }
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();

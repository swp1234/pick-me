/* ========================================
   Pick Me Test - SNS Comment Simulator
   10 social media posts with reaction choices
   Real-time pick-me meter
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

    // --- Post data: 10 SNS scenarios ---
    // Each post has: key, avatar emoji, platform style, 3 comment options with points
    var posts = [
        { key: 'p1', avatar: '\uD83D\uDC69\u200D\uD83D\uDCBB', platform: 'insta' },
        { key: 'p2', avatar: '\uD83D\uDC68\u200D\uD83C\uDFA4', platform: 'twitter' },
        { key: 'p3', avatar: '\uD83D\uDC6B',                    platform: 'insta' },
        { key: 'p4', avatar: '\uD83C\uDFC6',                    platform: 'twitter' },
        { key: 'p5', avatar: '\uD83C\uDF89',                    platform: 'insta' },
        { key: 'p6', avatar: '\uD83D\uDCF8',                    platform: 'twitter' },
        { key: 'p7', avatar: '\uD83C\uDF93',                    platform: 'insta' },
        { key: 'p8', avatar: '\uD83D\uDCAA',                    platform: 'twitter' },
        { key: 'p9', avatar: '\u2708\uFE0F',                    platform: 'insta' },
        { key: 'p10', avatar: '\uD83C\uDFB5',                   platform: 'twitter' }
    ];

    // Comment option points: c1=sincere(0), c2=subtle self-promo(2), c3=snarky/pick-me(3)
    // Like=1, Ignore=0
    var commentPoints = [0, 2, 3];
    var LIKE_POINTS = 1;
    var IGNORE_POINTS = 0;
    var MAX_SCORE = 30; // 10 posts x max 3

    // --- Tier definitions ---
    var tiers = [
        { key: 'secure',    emoji: '\uD83D\uDC51', color: '#22c55e', min: 0,  max: 6 },
        { key: 'chill',     emoji: '\uD83D\uDE0E', color: '#3b82f6', min: 7,  max: 12 },
        { key: 'mild',      emoji: '\uD83D\uDE48', color: '#eab308', min: 13, max: 18 },
        { key: 'certified', emoji: '\uD83D\uDE4B', color: '#f97316', min: 19, max: 24 },
        { key: 'ultimate',  emoji: '\uD83D\uDC85', color: '#ef4444', min: 25, max: 30 }
    ];

    // --- State ---
    var currentPost = 0;
    var totalScore = 0;
    var answers = []; // { postIndex, action: 'comment'|'like'|'ignore', commentIdx?, points }
    var isTransitioning = false;
    var commentExpanded = false;

    // --- DOM caching ---
    var startScreen = $('startScreen');
    var feedScreen = $('feedScreen');
    var resultScreen = $('resultScreen');
    var startBtn = $('startBtn');
    var progressFill = $('progressFill');
    var progressText = $('progressText');
    var meterFill = $('meterFill');
    var meterValue = $('meterValue');
    var postCard = $('postCard');
    var postAvatar = $('postAvatar');
    var postUsername = $('postUsername');
    var postPlatform = $('postPlatform');
    var postImage = $('postImage');
    var postCaption = $('postCaption');
    var postLikes = $('postLikes');
    var postTime = $('postTime');
    var commentSection = $('commentSection');
    var commentOptions = $('commentOptions');
    var btnComment = $('btnComment');
    var btnLike = $('btnLike');
    var btnIgnore = $('btnIgnore');
    var likeHeart = $('likeHeart');

    // Result DOM
    var tierBadge = $('tierBadge');
    var resultMeterFill = $('resultMeterFill');
    var resultScore = $('resultScore');
    var tierName = $('tierName');
    var tierDesc = $('tierDesc');
    var patternAnalysis = $('patternAnalysis');
    var retakeBtn = $('retakeBtn');
    var shareTwitterBtn = $('shareTwitter');
    var shareCopyBtn = $('shareCopy');
    var saveCardBtn = $('saveCardBtn');

    // Theme & Lang
    var themeToggle = $('themeToggle');
    var themeIcon = $('themeIcon');
    var langBtn = $('langBtn');
    var langDropdown = $('langDropdown');
    var currentLangLabel = $('currentLang');

    var langNames = {
        ko: '\uD55C\uAD6D\uC5B4', en: 'English', zh: '\u4E2D\u6587',
        hi: '\u0939\u093F\u0928\u094D\u0926\u0940', ru: '\u0420\u0443\u0441\u0441\u043A\u0438\u0439',
        ja: '\u65E5\u672C\u8A9E', es: 'Espa\u00F1ol', pt: 'Portugu\u00EAs',
        id: 'Indonesia', tr: 'T\u00FCrk\u00E7e', de: 'Deutsch', fr: 'Fran\u00E7ais'
    };

    // --- Helpers ---
    function getTier(score) {
        for (var i = tiers.length - 1; i >= 0; i--) {
            if (score >= tiers[i].min) return tiers[i];
        }
        return tiers[0];
    }

    function getPercent(score) {
        return Math.round((score / MAX_SCORE) * 100);
    }

    function showScreen(screen) {
        startScreen.style.display = 'none';
        feedScreen.style.display = 'none';
        resultScreen.style.display = 'none';
        startScreen.classList.remove('active');
        feedScreen.classList.remove('active');
        resultScreen.classList.remove('active');
        screen.style.display = '';
        screen.classList.add('active');
        window.scrollTo({ top: 0, behavior: 'smooth' });
    }

    // --- Random-ish like counts & time labels ---
    var fakeLikes = [847, 1243, 532, 2891, 1567, 378, 4210, 962, 3105, 756];
    var fakeTimeKeys = ['time.1h', 'time.3h', 'time.5h', 'time.8h', 'time.12h',
                        'time.1d', 'time.2d', 'time.3d', 'time.5d', 'time.1w'];


    function getActiveLang() {
        var inst = getI18n();
        if (inst && inst.currentLang) return inst.currentLang;
        try {
            return new URLSearchParams(window.location.search).get('lang') || 'en';
        } catch (e) {
            return 'en';
        }
    }

    function preserveLanguageLinks() {
        try {
            var lang = getActiveLang();
            document.querySelectorAll('.related-grid a, a[href^="/"]').forEach(function(a) {
                var href = a.getAttribute('href');
                if (!href || href.startsWith('http') || href.startsWith('#')) return;
                var url = new URL(href, window.location.origin);
                url.searchParams.set('lang', lang);
                if (a.closest('.related-grid') && !url.searchParams.has('source')) {
                    url.searchParams.set('source', 'pick_me_result');
                }
                a.setAttribute('href', url.pathname + url.search + url.hash);
                if (a.closest('.related-grid') && !a.dataset.ctaTracked) {
                    a.dataset.ctaTracked = 'true';
                    a.addEventListener('click', function() {
                        if (typeof gtag === 'function') {
                            gtag('event', 'content_cta_click', {
                                cta_surface: 'related_tests',
                                destination: a.getAttribute('href'),
                                source: 'pick_me_result',
                                lang: getActiveLang()
                            });
                        }
                    });
                }
            });
        } catch (e) {}
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
                        preserveLanguageLinks();
                        refreshCurrentView();
                    }).catch(function() {});
                }
            });
        });

        var inst = getI18n();
        if (inst && currentLangLabel) {
            currentLangLabel.textContent = langNames[inst.currentLang] || inst.currentLang;
        }
    }

    function refreshCurrentView() {
        if (feedScreen.classList.contains('active')) {
            renderPost();
        } else if (resultScreen.classList.contains('active')) {
            renderResult();
        }
    }

    // --- Start ---
    function startTest() {
        currentPost = 0;
        totalScore = 0;
        answers = [];
        isTransitioning = false;
        commentExpanded = false;
        updateMeter();
        showScreen(feedScreen);
        renderPost();

        if (typeof gtag === 'function') {
            gtag('event', 'test_start', { event_category: 'pick-me', app_name: 'pick-me' });
            gtag('event', 'quiz_start', { event_category: 'pick-me' });
        }
    }

    // --- Update pick-me meter ---
    function updateMeter() {
        var pct = getPercent(totalScore);
        if (meterFill) meterFill.style.width = pct + '%';
        if (meterValue) {
            meterValue.textContent = pct + '%';
            meterValue.classList.add('bump');
            setTimeout(function() { meterValue.classList.remove('bump'); }, 400);
        }
        // Color shift
        if (meterFill) {
            if (pct < 30) meterFill.style.background = 'linear-gradient(90deg, #22c55e, #3b82f6)';
            else if (pct < 60) meterFill.style.background = 'linear-gradient(90deg, #3b82f6, #eab308)';
            else if (pct < 80) meterFill.style.background = 'linear-gradient(90deg, #eab308, #f97316)';
            else meterFill.style.background = 'linear-gradient(90deg, #f97316, #ef4444)';
        }
    }

    // --- Render post ---
    function renderPost() {
        var p = posts[currentPost];
        var num = currentPost + 1;
        var total = posts.length;

        // Progress
        var pct = (currentPost / total) * 100;
        if (progressFill) progressFill.style.width = pct + '%';
        if (progressText) progressText.textContent = num + ' / ' + total;

        // Post content
        if (postAvatar) postAvatar.textContent = p.avatar;
        if (postUsername) postUsername.textContent = t('posts.' + p.key + '.username', 'user_' + num);
        if (postPlatform) {
            postPlatform.textContent = p.platform === 'insta' ? 'Instagram' : 'X (Twitter)';
            postPlatform.className = 'post-platform ' + p.platform;
        }
        if (postImage) postImage.textContent = t('posts.' + p.key + '.image', '');
        if (postCaption) postCaption.textContent = t('posts.' + p.key + '.caption', 'Post ' + num);
        if (postLikes) postLikes.textContent = fakeLikes[currentPost].toLocaleString() + ' ' + t('feed.likes', 'likes');
        if (postTime) postTime.textContent = t(fakeTimeKeys[currentPost], '1h');

        // Reset UI state
        commentExpanded = false;
        if (commentSection) commentSection.classList.remove('expanded');
        if (commentOptions) commentOptions.innerHTML = '';
        enableActions();

        // Build comment options
        buildCommentOptions(p);

        // Like heart reset
        if (likeHeart) {
            likeHeart.classList.remove('liked');
            likeHeart.style.display = 'none';
        }

        // Card entrance animation
        if (postCard) {
            postCard.classList.remove('slide-in');
            void postCard.offsetWidth; // force reflow
            postCard.classList.add('slide-in');
        }
    }

    // --- Build comment options ---
    function buildCommentOptions(p) {
        if (!commentOptions) return;
        commentOptions.innerHTML = '';

        for (var i = 0; i < 3; i++) {
            var btn = document.createElement('button');
            btn.className = 'comment-option';
            btn.setAttribute('data-index', i);
            var label = t('posts.' + p.key + '.c' + (i + 1), 'Comment ' + (i + 1));
            btn.textContent = label;

            (function(idx) {
                btn.addEventListener('click', function() {
                    if (!isTransitioning) {
                        selectComment(idx);
                    }
                });
            })(i);

            commentOptions.appendChild(btn);
        }
    }

    // --- Action handlers ---
    function disableActions() {
        if (btnComment) btnComment.disabled = true;
        if (btnLike) btnLike.disabled = true;
        if (btnIgnore) btnIgnore.disabled = true;
        var opts = commentOptions ? commentOptions.querySelectorAll('.comment-option') : [];
        opts.forEach(function(o) { o.disabled = true; });
    }

    function enableActions() {
        if (btnComment) btnComment.disabled = false;
        if (btnLike) btnLike.disabled = false;
        if (btnIgnore) btnIgnore.disabled = false;
    }

    // Toggle comment expansion
    function toggleComments() {
        if (isTransitioning) return;
        commentExpanded = !commentExpanded;
        if (commentSection) {
            if (commentExpanded) {
                commentSection.classList.add('expanded');
            } else {
                commentSection.classList.remove('expanded');
            }
        }
    }

    // Select a comment
    function selectComment(idx) {
        if (isTransitioning) return;
        isTransitioning = true;

        var points = commentPoints[idx];
        totalScore += points;
        answers.push({
            postIndex: currentPost,
            action: 'comment',
            commentIdx: idx,
            points: points
        });

        // Visual feedback
        var opts = commentOptions.querySelectorAll('.comment-option');
        opts.forEach(function(o, i) {
            o.disabled = true;
            if (i === idx) {
                o.classList.add('selected');
                if (points === 0) o.classList.add('sincere');
                else if (points === 2) o.classList.add('subtle');
                else o.classList.add('pickme');
            } else {
                o.classList.add('faded');
            }
        });

        // Show floating feedback
        showReactionFeedback(points);
        updateMeter();
        disableActions();

        advancePost();
    }

    // Like action
    function handleLike() {
        if (isTransitioning) return;
        isTransitioning = true;

        totalScore += LIKE_POINTS;
        answers.push({
            postIndex: currentPost,
            action: 'like',
            points: LIKE_POINTS
        });

        // Heart animation
        if (likeHeart) {
            likeHeart.style.display = 'block';
            likeHeart.classList.add('liked');
        }

        // Button feedback
        if (btnLike) btnLike.classList.add('action-selected');

        showReactionFeedback(LIKE_POINTS);
        updateMeter();
        disableActions();

        advancePost();
    }

    // Ignore action
    function handleIgnore() {
        if (isTransitioning) return;
        isTransitioning = true;

        totalScore += IGNORE_POINTS;
        answers.push({
            postIndex: currentPost,
            action: 'ignore',
            points: IGNORE_POINTS
        });

        if (btnIgnore) btnIgnore.classList.add('action-selected');

        showReactionFeedback(IGNORE_POINTS);
        updateMeter();
        disableActions();

        advancePost();
    }

    // --- Floating reaction feedback ---
    function showReactionFeedback(points) {
        var floater = document.createElement('div');
        floater.className = 'reaction-feedback';

        if (points === 0) {
            floater.textContent = t('feed.secure', 'Secure!');
            floater.classList.add('sincere');
        } else if (points <= 1) {
            floater.textContent = '+' + points;
            floater.classList.add('neutral');
        } else if (points === 2) {
            floater.textContent = '+' + points + ' \uD83D\uDC40';
            floater.classList.add('subtle');
        } else {
            floater.textContent = '+' + points + ' \uD83D\uDE4B';
            floater.classList.add('pickme');
        }

        if (postCard) {
            postCard.appendChild(floater);
        }

        setTimeout(function() {
            if (floater.parentNode) floater.parentNode.removeChild(floater);
        }, 1200);
    }

    function prefersReducedMotion() {
        return typeof window.matchMedia === 'function' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    }

    // --- Advance to next post ---
    function advancePost() {
        var reduced = prefersReducedMotion();
        var waitMs = reduced ? 20 : 1000;
        var slideMs = reduced ? 10 : 350;
        setTimeout(function() {
            if (currentPost < posts.length - 1) {
                currentPost++;
                if (postCard) {
                    postCard.classList.add('slide-out');
                    setTimeout(function() {
                        postCard.classList.remove('slide-out');
                        // Reset action button states
                        if (btnLike) btnLike.classList.remove('action-selected');
                        if (btnIgnore) btnIgnore.classList.remove('action-selected');
                        renderPost();
                        isTransitioning = false;
                    }, slideMs);
                } else {
                    renderPost();
                    isTransitioning = false;
                }
            } else {
                // Complete
                if (progressFill) progressFill.style.width = '100%';
                showScreen(resultScreen);
                renderResult();
                isTransitioning = false;
            }
        }, waitMs);
    }

    // --- Animate count ---
    function animateCount(element, from, to, suffix) {
        suffix = suffix || '';
        if (prefersReducedMotion()) {
            element.textContent = to + suffix;
            return;
        }
        var duration = 600;
        var startTime = null;
        var diff = to - from;

        function step(timestamp) {
            if (!startTime) startTime = timestamp;
            var elapsed = timestamp - startTime;
            var progress = Math.min(elapsed / duration, 1);
            var eased = 1 - Math.pow(1 - progress, 3);
            var current = Math.round(from + diff * eased);
            element.textContent = current + suffix;
            if (progress < 1) requestAnimationFrame(step);
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
        tierClasses.forEach(function(cls) { resultCard.classList.remove(cls); });
        resultCard.classList.add('tier-' + tier.key);

        // Badge
        if (tierBadge) tierBadge.textContent = tier.emoji + ' ' + t('tiers.' + tier.key + '.name', tier.key);

        // Score animation
        if (resultScore) {
            resultScore.textContent = '0%';
            setTimeout(function() { animateCount(resultScore, 0, pct, '%'); }, 300);
        }

        // Meter fill
        if (resultMeterFill) {
            resultMeterFill.style.width = '0%';
            setTimeout(function() { resultMeterFill.style.width = pct + '%'; }, 500);
        }

        // Tier info
        if (tierName) {
            tierName.textContent = tier.emoji + ' ' + t('tiers.' + tier.key + '.name', tier.key);
            tierName.style.color = tier.color;
        }
        if (tierDesc) tierDesc.textContent = t('tiers.' + tier.key + '.desc', '');

        // Pattern analysis & curated books
        renderPatternAnalysis();
        renderCuratedResources(tier);
        preserveLanguageLinks();

        // GA4 (clean categorical completion without numeric score leak)
        if (typeof gtag === 'function') {
            gtag('event', 'test_complete', {
                event_category: 'pick-me',
                app_name: 'pick-me',
                result_type: tier.key
            });
        }
    }

    // --- Pattern analysis ---
    function renderPatternAnalysis() {
        if (!patternAnalysis) return;
        patternAnalysis.innerHTML = '';

        // Count action types
        var commentCount = 0, likeCount = 0, ignoreCount = 0;
        var sinceCount = 0, subtleCount = 0, pickmeCount = 0;

        answers.forEach(function(a) {
            if (a.action === 'comment') {
                commentCount++;
                if (a.commentIdx === 0) sinceCount++;
                else if (a.commentIdx === 1) subtleCount++;
                else pickmeCount++;
            } else if (a.action === 'like') {
                likeCount++;
            } else {
                ignoreCount++;
            }
        });

        // Action summary
        var summaryDiv = document.createElement('div');
        summaryDiv.className = 'pattern-summary';

        var items = [
            { icon: '\uD83D\uDCAC', label: t('pattern.comments', 'Comments'), count: commentCount, cls: 'comment' },
            { icon: '\u2764\uFE0F', label: t('pattern.likes', 'Likes'), count: likeCount, cls: 'like' },
            { icon: '\uD83D\uDC40', label: t('pattern.ignores', 'Scrolled past'), count: ignoreCount, cls: 'ignore' }
        ];

        items.forEach(function(item) {
            var el = document.createElement('div');
            el.className = 'pattern-item ' + item.cls;
            el.innerHTML = '<span class="pattern-icon">' + item.icon + '</span>' +
                '<span class="pattern-label">' + item.label + '</span>' +
                '<span class="pattern-count">' + item.count + '</span>';
            summaryDiv.appendChild(el);
        });

        patternAnalysis.appendChild(summaryDiv);

        // Comment style breakdown (only if comments made)
        if (commentCount > 0) {
            var styleDiv = document.createElement('div');
            styleDiv.className = 'comment-styles';

            var styleTitle = document.createElement('h4');
            styleTitle.textContent = t('pattern.commentStyle', 'Comment Style');
            styleDiv.appendChild(styleTitle);

            var styles = [
                { label: t('pattern.sincere', 'Sincere'), count: sinceCount, cls: 'sincere' },
                { label: t('pattern.selfPromo', 'Self-promo'), count: subtleCount, cls: 'subtle' },
                { label: t('pattern.pickmeStyle', 'Pick-me'), count: pickmeCount, cls: 'pickme' }
            ];

            styles.forEach(function(s) {
                var bar = document.createElement('div');
                bar.className = 'style-bar';
                var w = commentCount > 0 ? Math.round((s.count / commentCount) * 100) : 0;
                bar.innerHTML = '<span class="style-label">' + s.label + '</span>' +
                    '<div class="style-track"><div class="style-fill ' + s.cls + '" style="width:' + w + '%"></div></div>' +
                    '<span class="style-count">' + s.count + '</span>';
                styleDiv.appendChild(bar);
            });

            patternAnalysis.appendChild(styleDiv);
        }

        // Post-by-post log
        var logDiv = document.createElement('div');
        logDiv.className = 'post-log';
        var logTitle = document.createElement('h4');
        logTitle.textContent = t('pattern.postLog', 'Post-by-post');
        logDiv.appendChild(logTitle);

        answers.forEach(function(a) {
            var p = posts[a.postIndex];
            var row = document.createElement('div');
            row.className = 'log-row';

            var left = document.createElement('span');
            left.className = 'log-post';
            left.textContent = p.avatar + ' ' + t('posts.' + p.key + '.username', 'user');

            var right = document.createElement('span');
            right.className = 'log-action';
            if (a.action === 'comment') {
                var cType = a.commentIdx === 0 ? 'sincere' : a.commentIdx === 1 ? 'subtle' : 'pickme';
                right.classList.add(cType);
                right.textContent = '\uD83D\uDCAC +' + a.points;
            } else if (a.action === 'like') {
                right.classList.add('neutral');
                right.textContent = '\u2764\uFE0F +' + a.points;
            } else {
                right.classList.add('sincere');
                right.textContent = '\uD83D\uDC40 +0';
            }

            row.appendChild(left);
            row.appendChild(right);
            logDiv.appendChild(row);
        });

        patternAnalysis.appendChild(logDiv);
    }

    function getShareUrl() {
        return 'https://dopabrain.com/pick-me/?lang=' + encodeURIComponent(getActiveLang()) + '&utm_source=share';
    }

    function showPmToast(msg) {
        var toast = $('pmToast');
        if (!toast) {
            toast = document.createElement('div');
            toast.id = 'pmToast';
            toast.className = 'pm-toast';
            toast.setAttribute('role', 'status');
            toast.setAttribute('aria-live', 'polite');
            document.body.appendChild(toast);
        }
        toast.textContent = msg;
        toast.classList.add('show');
        clearTimeout(toast._hideTimer);
        toast._hideTimer = setTimeout(function() { toast.classList.remove('show'); }, 2200);
    }

    function getAmazonDomain(lang) {
        var map = { ja: 'amazon.co.jp', de: 'amazon.de', fr: 'amazon.fr', es: 'amazon.es', hi: 'amazon.in' };
        return map[lang] || 'amazon.com';
    }

    function renderCuratedResources(tier) {
        var container = $('curated-resources-card');
        if (!container) return;
        var lang = getActiveLang();
        var domain = getAmazonDomain(lang);
        var resultKey = tier ? tier.key : getTier(totalScore).key;
        var items = [
            {
                key: 'presentationOfSelf',
                asin: '0385094027',
                title: t('curated.goffmanTitle', 'The Presentation of Self in Everyday Life — Erving Goffman'),
                desc: t('curated.goffmanDesc', 'Foundational sociology classic on impression management, social stages, and self-presentation.')
            },
            {
                key: 'digitalMinimalism',
                asin: '0525536515',
                title: t('curated.newportTitle', 'Digital Minimalism — Cal Newport'),
                desc: t('curated.newportDesc', 'Practical strategies to escape algorithmic validation loops and reclaim authentic focus.')
            }
        ];

        container.innerHTML =
            '<div class="curated-resources-header">' +
                '<h3 class="curated-resources-title">' + t('curated.title', 'Recommended Social Psychology & Digital Balance Books') + '</h3>' +
                '<span class="curated-disclosure">' + t('curated.disclosure', 'Affiliate links') + '</span>' +
            '</div>' +
            '<p class="curated-resources-subtitle">' + t('curated.subtitle', 'Pair your reflection pattern with classic insights on social impression and mindful attention.') + '</p>' +
            '<div class="curated-list">' +
                items.map(function(item) {
                    return '<a class="curated-item" href="https://www.' + domain + '/dp/' + item.asin + '?tag=dopabrain-20" target="_blank" rel="noopener sponsored nofollow" data-resource-key="' + item.key + '">' +
                        '<div class="curated-item-top">' +
                            '<span class="curated-item-title">' + item.title + '</span>' +
                            '<span class="curated-item-cta">' + t('curated.cta', 'View Book ->') + '</span>' +
                        '</div>' +
                        '<span class="curated-item-desc">' + item.desc + '</span>' +
                    '</a>';
                }).join('') +
            '</div>';
        container.style.display = 'block';

        container.querySelectorAll('.curated-item').forEach(function(link) {
            link.addEventListener('click', function() {
                if (typeof gtag === 'function') {
                    gtag('event', 'curated_resource_click', {
                        app_name: 'pick-me',
                        resource_key: link.getAttribute('data-resource-key'),
                        result_type: resultKey,
                        content_locale: lang,
                        cta_surface: 'curated_resources'
                    });
                    gtag('event', 'content_cta_click', {
                        cta_type: 'curated_book',
                        destination: link.getAttribute('href'),
                        source: 'pick-me'
                    });
                }
            });
        });
    }

    function saveStoryCard() {
        var canvas = $('shareCanvas');
        if (!canvas) return;
        var tier = getTier(totalScore);
        var tierLabel = t('tiers.' + tier.key + '.name', tier.key);
        var pct = getPercent(totalScore);
        canvas.width = 1080;
        canvas.height = 1920;
        var ctx = canvas.getContext('2d');

        var grad = ctx.createLinearGradient(0, 0, 1080, 1920);
        grad.addColorStop(0, '#0f0a1e');
        grad.addColorStop(0.5, '#1d1233');
        grad.addColorStop(1, '#2d112b');
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, 1080, 1920);

        ctx.fillStyle = 'rgba(244, 63, 94, 0.2)';
        ctx.beginPath();
        ctx.arc(880, 260, 250, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = 'rgba(255, 255, 255, 0.05)';
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.14)';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.roundRect(72, 120, 936, 1680, 44);
        ctx.fill();
        ctx.stroke();

        ctx.textAlign = 'center';
        ctx.fillStyle = '#fb7185';
        ctx.font = '700 32px Inter, sans-serif';
        ctx.fillText('DOPABRAIN SNS REFLECTION', 540, 235);

        ctx.fillStyle = '#ffffff';
        ctx.font = '700 54px Inter, sans-serif';
        ctx.fillText(t('result.meterLabel', 'Pick Me Meter'), 540, 330);

        ctx.font = '700 130px Inter, sans-serif';
        ctx.fillText(tier.emoji, 540, 560);

        ctx.fillStyle = tier.color || '#f43f5e';
        ctx.font = '800 116px Inter, sans-serif';
        ctx.fillText(pct + '%', 540, 740);

        ctx.fillStyle = '#ffffff';
        ctx.font = '700 56px Inter, sans-serif';
        ctx.fillText(tierLabel, 540, 860);

        var desc = t('tiers.' + tier.key + '.desc', '');
        ctx.fillStyle = '#d1d5db';
        ctx.font = '500 32px Inter, sans-serif';
        var words = String(desc || '').split(/\s+/);
        var line = '';
        var lines = [];
        for (var i = 0; i < words.length; i++) {
            var test = line ? line + ' ' + words[i] : words[i];
            if (ctx.measureText(test).width > 780 && line) {
                lines.push(line);
                line = words[i];
            } else {
                line = test;
            }
        }
        if (line) lines.push(line);
        lines.slice(0, 5).forEach(function(ln, idx) {
            ctx.fillText(ln, 540, 990 + idx * 52);
        });

        ctx.fillStyle = '#9ca3af';
        ctx.font = '600 30px Inter, sans-serif';
        ctx.fillText('dopabrain.com/pick-me/', 540, 1700);

        try {
            var link = document.createElement('a');
            link.download = 'pick-me-card-' + getActiveLang() + '.png';
            link.href = canvas.toDataURL('image/png');
            link.click();
        } catch (e) {}

        showPmToast(t('share.saved', 'Story card saved (1080×1920)!'));
        if (typeof gtag === 'function') {
            gtag('event', 'save_image', {
                event_category: 'pick-me',
                app_name: 'pick-me',
                result_type: tier.key,
                save_surface: 'result_story_1080x1920'
            });
        }
    }

    // --- Share (clean URL without score leakage) ---
    function shareTwitter() {
        var text = t('share.text', 'How much Pick-Me energy do your SNS habits carry? Take the 10-post feed test:');
        var url = getShareUrl();
        window.open(
            'https://twitter.com/intent/tweet?text=' + encodeURIComponent(text) + '&url=' + encodeURIComponent(url),
            '_blank',
            'noopener'
        );
        if (typeof gtag === 'function') {
            gtag('event', 'share', { method: 'twitter', content_type: 'quiz_result' });
        }
    }

    function copyUrl() {
        var url = getShareUrl();
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

    // --- Loader ---
    function hideLoader() {
        var loader = $('app-loader');
        if (loader) loader.classList.add('hidden');
    }

    // --- Bind events ---
    function bindEvents() {
        if (startBtn) startBtn.addEventListener('click', startTest);
        if (btnComment) btnComment.addEventListener('click', toggleComments);
        if (btnLike) btnLike.addEventListener('click', handleLike);
        if (btnIgnore) btnIgnore.addEventListener('click', handleIgnore);

        if (retakeBtn) {
            retakeBtn.addEventListener('click', function() {
                showScreen(startScreen);
                if (resultMeterFill) resultMeterFill.style.width = '0%';
                if (resultScore) resultScore.textContent = '0%';
            });
        }

        if (saveCardBtn) saveCardBtn.addEventListener('click', saveStoryCard);
        if (shareTwitterBtn) shareTwitterBtn.addEventListener('click', shareTwitter);
        if (shareCopyBtn) shareCopyBtn.addEventListener('click', copyUrl);
    }

    // --- Init ---
    function init() {
        initTheme();
        initLangSelector();
        bindEvents();

        var inst = getI18n();
        if (inst && typeof inst.loadTranslations === 'function') {
            inst.loadTranslations(inst.currentLang).then(function() {
                if (typeof inst.updateUI === 'function') inst.updateUI();
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

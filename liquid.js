// Data model: collection 'faqs' with fields { question, category, upvotes, createdAt }
(function () {
    const FAQ_COLLECTION = 'faqs';
    const faqList = document.getElementById('faqList');
    const filtersContainer = document.getElementById('filters');
    const sortMost = document.getElementById('sortMost');
    const sortNewest = document.getElementById('sortNewest');

    let faqs = [];
    let useFirestore = !!window.db;
    let sortMode = 'most'; // 'most' | 'newest'

    const SAMPLE_FAQS = [
        { id: 'sample-1', question: 'How do I apply for revaluation?', category: 'Exams', upvotes: 12, createdAt: Date.now(), sample: true },
        { id: 'sample-2', question: 'When are the semester fees due?', category: 'Fees', upvotes: 8, createdAt: Date.now() - 1000 * 60 * 60 * 24, sample: true },
        { id: 'sample-3', question: 'Who do I contact about placement support?', category: 'Placements', upvotes: 5, createdAt: Date.now() - 1000 * 60 * 60 * 48, sample: true }
    ];

    const loadSamplesBtn = document.getElementById('loadSamplesBtn');
    const seedFirestoreBtn = document.getElementById('seedFirestoreBtn');

    function consoleError(...args) { console.error('[FAQ Voting]', ...args); }

    function render() {
        faqList.innerHTML = '';
        const activePill = filtersContainer.querySelector('.pill.active');
        const filter = activePill ? activePill.getAttribute('data-cat') : 'All';
        let items = faqs.slice();
        if (filter !== 'All') items = items.filter(i => i.category === filter);
        if (sortMode === 'most') items.sort((a, b) => (b.upvotes || 0) - (a.upvotes || 0));
        else items.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));

        if (!items.length) {
            // Show samples when empty
            items = SAMPLE_FAQS.map(i => ({ ...i }));
        }

        items.forEach(item => {
            const card = document.createElement('article');
            card.className = 'faq';


            const head = document.createElement('div'); head.className = 'head';
            const left = document.createElement('div'); left.className = 'left';
            const q = document.createElement('h3'); q.className = 'question'; q.textContent = item.question + (item.sample ? ' — Sample Question' : '');
            const meta = document.createElement('div'); meta.className = 'meta';
            meta.innerHTML = `<span class="badge">${item.category}</span> <span style="margin-left:8px">${new Date(item.createdAt).toLocaleDateString()}</span>`;
            left.appendChild(q); left.appendChild(meta);

            const right = document.createElement('div'); right.className = 'card-right';

            // Confusion vertical indicator
            const confusionContainer = document.createElement('div'); confusionContainer.className = 'confusion-container';
            const confusionWrap = document.createElement('div'); confusionWrap.className = 'confusion';
            const bar = document.createElement('div'); bar.className = 'bar';
            // determine level and height
            const votes = item.upvotes || 0;
            const percent = Math.min(100, Math.round((votes / 30) * 100)); // Increased denominator for better scale
            const heightPercent = Math.max(10, percent);
            bar.style.height = `${heightPercent}%`;

            if (votes <= 5) bar.style.background = 'var(--accent-green)';
            else if (votes <= 15) bar.style.background = 'var(--accent-amber)';
            else bar.style.background = 'var(--accent-red)';

            confusionWrap.appendChild(bar);
            const confusionLabel = document.createElement('div'); confusionLabel.className = 'confusion-label'; confusionLabel.textContent = 'Confusion';
            confusionContainer.appendChild(confusionWrap); confusionContainer.appendChild(confusionLabel);
            right.appendChild(confusionContainer);

            // vote area
            const voteArea = document.createElement('div'); voteArea.className = 'vote-area';
            const upBtn = document.createElement('button'); upBtn.className = 'vote-btn'; upBtn.textContent = 'Vote'; upBtn.setAttribute('aria-label', 'Mark as confusing');
            const countLabel = document.createElement('div'); countLabel.className = 'vote-helper'; countLabel.textContent = `${votes} confused`;
            voteArea.appendChild(upBtn); voteArea.appendChild(countLabel);
            right.appendChild(voteArea);

            head.appendChild(left); head.appendChild(right);
            card.appendChild(head);

            const answer = document.createElement('div'); answer.className = 'answer';
            answer.innerHTML = '<div class="seen-badge">Seen by admin</div><div style="margin-top:8px;color:var(--text-muted)">Why students are confused (optional note placeholder)</div>';
            answer.style.display = 'none';
            card.appendChild(answer);

            // Expand/collapse
            q.style.cursor = 'pointer';
            q.addEventListener('click', () => {
                answer.style.display = (answer.style.display === 'none') ? 'block' : 'none';
            });

            // Upvote handling with optimistic UI and session lock via localStorage
            upBtn.addEventListener('click', async () => {
                const voteKey = `voted_${item.id}`;
                if (localStorage.getItem(voteKey)) return;
                // optimistic
                item.upvotes = (item.upvotes || 0) + 1;
                // update UI
                countLabel.textContent = `${item.upvotes} confused`;
                upBtn.disabled = true; upBtn.textContent = '✔ Confusing';
                const helper = document.createElement('div'); helper.className = 'vote-helper'; helper.textContent = 'Thanks!'; voteArea.appendChild(helper);
                // update confusion bar visuals
                const newPercent = Math.min(100, Math.round((item.upvotes / 30) * 100));
                const newHeightPercent = Math.max(10, newPercent);
                bar.style.height = `${newHeightPercent}%`;

                if (item.upvotes <= 5) bar.style.background = 'var(--accent-green)';
                else if (item.upvotes <= 15) bar.style.background = 'var(--accent-amber)';
                else bar.style.background = 'var(--accent-red)';
                localStorage.setItem(voteKey, '1');

                try {
                    if (useFirestore && !item.sample) {
                        const docRef = window.db.collection(FAQ_COLLECTION).doc(item.id);
                        await window.db.runTransaction(async tx => {
                            const doc = await tx.get(docRef);
                            if (!doc.exists) return tx.set(docRef, { upvotes: item.upvotes }, { merge: true });
                            tx.update(docRef, { upvotes: (doc.data().upvotes || 0) + 1 });
                        });
                    } else if (!useFirestore) {
                        // persist changes locally for demo data
                        const stored = JSON.parse(localStorage.getItem('demo_faqs') || 'null') || SAMPLE_FAQS;
                        const idx = stored.findIndex(d => d.id === item.id);
                        if (idx >= 0) { stored[idx].upvotes = item.upvotes; }
                        localStorage.setItem('demo_faqs', JSON.stringify(stored));
                    }
                } catch (err) {
                    consoleError('Upvote failed', err);
                }
            });

            // set initial disabled state if already voted
            if (localStorage.getItem(`voted_${item.id}`)) { upBtn.disabled = true; upBtn.textContent = '✔ Confusing'; }

            // append a separate label row for upvote text
            // (count label is inside vote area)

            faqList.appendChild(card);
        });
    }

    async function loadFromFirestore() {
        try {
            const snapshot = await window.db.collection(FAQ_COLLECTION).get();
            const docs = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
            if (!docs.length) {
                faqs = SAMPLE_FAQS.map(i => ({ ...i }));
            } else {
                faqs = docs.map(d => ({ ...d, createdAt: d.createdAt ? d.createdAt.toMillis ? d.createdAt.toMillis() : d.createdAt : Date.now() }));
            }
        } catch (err) {
            consoleError('Failed loading Firestore:', err);
            faqs = JSON.parse(localStorage.getItem('demo_faqs') || 'null') || SAMPLE_FAQS.map(i => ({ ...i }));
            useFirestore = false;
        }
        render();
    }

    async function seedFirestoreWithSamples() {
        if (!useFirestore) return alert('Firestore not configured.');
        try {
            for (const s of SAMPLE_FAQS) {
                const payload = { question: s.question, category: s.category, upvotes: s.upvotes || 0, createdAt: firebase.firestore.FieldValue.serverTimestamp() };
                await window.db.collection(FAQ_COLLECTION).add(payload);
            }
            // reload from firestore
            await loadFromFirestore();
            alert('Sample FAQs seeded to Firestore.');
        } catch (err) {
            consoleError('Seeding Firestore failed', err);
            alert('Seeding failed. See console for details.');
        }
    }

    function loadSamplesToLocal() {
        const copy = SAMPLE_FAQS.map(i => ({ ...i }));
        localStorage.setItem('demo_faqs', JSON.stringify(copy));
        faqs = copy;
        render();
    }

    function loadLocalDemo() {
        const stored = JSON.parse(localStorage.getItem('demo_faqs') || 'null');
        faqs = stored || SAMPLE_FAQS.map(i => ({ ...i }));
        render();
    }

    // Admin form
    const adminForm = document.getElementById('adminForm');
    adminForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const qText = document.getElementById('qText').value.trim();
        const qCategory = document.getElementById('qCategory').value;
        if (!qText) return;
        const payload = { question: qText, category: qCategory, upvotes: 0, createdAt: Date.now() };

        if (useFirestore) {
            try {
                const docRef = await window.db.collection(FAQ_COLLECTION).add(payload);
                payload.id = docRef.id;
                faqs.push(payload);
                render();
                adminForm.reset();
            } catch (err) {
                consoleError('Adding FAQ failed', err);
                alert('Unable to add FAQ to Firestore. It will be added locally.');
                payload.id = `local-${Date.now()}`;
                faqs.push(payload);
                localStorage.setItem('demo_faqs', JSON.stringify(faqs));
                render();
                adminForm.reset();
            }
        } else {
            payload.id = `local-${Date.now()}`;
            faqs.push(payload);
            localStorage.setItem('demo_faqs', JSON.stringify(faqs));
            render();
            adminForm.reset();
        }
    });

    // Controls
    // pill filters
    filtersContainer.addEventListener('click', (e) => {
        const btn = e.target.closest('.pill');
        if (!btn) return;
        filtersContainer.querySelectorAll('.pill').forEach(p => p.classList.remove('active'));
        btn.classList.add('active');
        render();
    });
    sortMost.addEventListener('click', () => { sortMode = 'most'; sortMost.classList.add('active'); sortNewest.classList.remove('active'); sortMost.setAttribute('aria-pressed', 'true'); sortNewest.setAttribute('aria-pressed', 'false'); render(); });
    sortNewest.addEventListener('click', () => { sortMode = 'newest'; sortNewest.classList.add('active'); sortMost.classList.remove('active'); sortNewest.setAttribute('aria-pressed', 'true'); sortMost.setAttribute('aria-pressed', 'false'); render(); });

    // admin sample buttons
    loadSamplesBtn.addEventListener('click', (e) => { e.preventDefault(); loadSamplesToLocal(); });
    seedFirestoreBtn.addEventListener('click', async (e) => { e.preventDefault(); if (!confirm('Seed Firestore with sample FAQs?')) return; await seedFirestoreWithSamples(); });

    // Initialize
    (async function init() {
        if (useFirestore) await loadFromFirestore(); else loadLocalDemo();
        // show/hide seed button depending on Firestore availability
        try { if (window.db) seedFirestoreBtn.style.display = 'inline-block'; else seedFirestoreBtn.style.display = 'none'; } catch (e) { seedFirestoreBtn.style.display = 'none'; }
    })();

})();

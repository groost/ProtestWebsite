document.addEventListener("DOMContentLoaded", init);

function init() {
    const form = document.getElementById('contactForm');
    const submitBtn = document.getElementById('submitBtn');

    form.addEventListener('submit', async (e) => {
        e.preventDefault();

        // Disable button and show loading state
        submitBtn.disabled = true;
        submitBtn.textContent = 'Sending...';

        // Get form data
        const formData = {
            email: document.getElementById('email').value,
            code: document.getElementById('code').value
        };

        try {
            const response = await fetch('/check-email', {
                method: 'POST',
                headers: {
                'Content-Type': 'application/json'
                },
                body: JSON.stringify(formData)
            });

            const result = await response.json();

            if (result.success) {
                showMessage('success', result.message);
                form.reset();
                giveAccess();
            } else {
                showMessage('error', result.message);
            }
        } catch (error) {
            showMessage('error', 'An error occurred. Please try again.');
            console.error('Error:', error);
        } finally {
            submitBtn.disabled = false;
            submitBtn.textContent = 'Send Message';
        }
    });

    let x = document.cookie;
    if(x === 'access=success') {
        giveAccess();
    }
}

function giveAccess() {
    document.cookie = "access=success; expires=Thu, 18 Dec 2026 12:00:00 UTC; path=/";
    const page = document.querySelector('main.page');
    if (page) {
        page.remove();
    } else {
        const container = document.querySelector('.container');
        if (container) container.remove();
    }

    const newPage = document.createElement('main');
    newPage.className = 'page';

    const card = document.createElement('section');
    card.className = 'card';

    const inner = document.createElement('div');
    inner.className = 'card-inner';

    const title = document.createElement('h1');
    title.innerText = 'Signal GroupChats';
    inner.appendChild(title);

    const subtitle = document.createElement('p');
    subtitle.className = 'subtitle';
    subtitle.innerText = 'Add and share Signal group chats for local organizing.';
    inner.appendChild(subtitle);

    const button = document.createElement('button');
    button.type = 'button';
    button.id = 'OpenPageButton';
    button.textContent = 'Add Signal Chat';
    inner.appendChild(button);

    card.appendChild(inner);
    newPage.appendChild(card);
    document.body.appendChild(newPage);

    const modal = document.getElementById('groupModal');
    modal.classList.remove('show');

    button.addEventListener('click', () => {
        modal.classList.add('show');
    });

    modal.addEventListener('click', (e) => {
        if (e.target === modal) {
            const formData = new FormData(document.getElementById('groupForm'));

            const data = {
                link: formData.get("link"),
                city: formData.get("city")
            };

            addLink(data);
            modal.classList.remove('show');
        }
    });
}

function addLink(data) {
    
}

async function getCoordsFromCity(city) {
    const res = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(city)}`
    );

    const data = await res.json();

    if (data.length === 0) {
        throw new Error("City not found");
    }

    return {
        lat: parseFloat(data[0].lat),
        lng: parseFloat(data[0].lon)
    };
}
const WHATSAPP_NUMBER = '5491123456789';
const STORAGE_KEY = 'lapreviaDraft';

const sizes = {
    individual: ['Individual 500 ml', 6500, 2],
    xl: ['XL 1 Litro', 10500, 4],
    party: ['Party Box 1,5 L', 15000, 8]
};

const compatibleMixers = {
    Fernet: ['Coca-Cola', 'Pepsi'],
    Gin: ['Agua tónica', 'Sprite'],
    Vodka: ['Speed', 'Red Bull', 'Jugo'],
    Ron: ['Coca-Cola', 'Jugo'],
    Whisky: ['Coca-Cola', 'Pepsi'],
    Tequila: ['Sprite', 'Jugo']
};

const getElement = id => document.getElementById(id);
const formatMoney = amount => new Intl.NumberFormat('es-AR', {
    style: 'currency',
    currency: 'ARS',
    maximumFractionDigits: 0
}).format(amount);

const extraPrices = {};
document.querySelectorAll('.checks input[type="checkbox"]').forEach(input => {
    extraPrices[input.dataset.name] = Number(input.dataset.p);
});

const defaultState = {
    sizeKey: 'party',
    drinkKey: 'Fernet',
    mixerKey: 'Coca-Cola',
    shots: 3,
    extras: ['Hielo', 'Golosinas']
};

let state = { ...defaultState };
let storageWarningShown = false;

function size(button) {
    if (!sizes[button.dataset.v]) {
        return;
    }

    state.sizeKey = button.dataset.v;
    render();
}

function drink(button, drinkName) {
    if (!compatibleMixers[drinkName]) {
        return;
    }

    state.drinkKey = drinkName;

    if (!compatibleMixers[drinkName].includes(state.mixerKey)) {
        state.mixerKey = compatibleMixers[drinkName][0];
    }

    render();
}

function mixer(button, mixerName) {
    if (!compatibleMixers[state.drinkKey]?.includes(mixerName)) {
        return;
    }

    state.mixerKey = mixerName;
    render();
}

function extra(input) {
    const extraName = input.dataset.name;

    if (!(extraName in extraPrices)) {
        return;
    }

    state.extras = state.extras.filter(name => name !== extraName);

    if (input.checked) {
        state.extras.push(extraName);
    }

    render();
}

function preset(sizeKey) {
    if (!sizes[sizeKey]) {
        return;
    }

    state.sizeKey = sizeKey;
    getElement('armar').scrollIntoView({ behavior: 'smooth' });
    render();
}

function storeState() {
    if (storageWarningShown) {
        return false;
    }

    try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
        return true;
    } catch (error) {
        storageWarningShown = true;
        console.warn('No se pudo guardar la previa en este dispositivo.', error);
        return false;
    }
}

function render() {
    if (!sizes[state.sizeKey]) {
        state = { ...defaultState };
    }

    const selectedSize = sizes[state.sizeKey];
    const [sizeName, basePrice, maxShots] = sizes[state.sizeKey];
    const allowedMixers = compatibleMixers[state.drinkKey];
    state.shots = Math.min(maxShots, Math.max(1, Number(state.shots) || 1));
    state.extras = state.extras.filter(name => name in extraPrices);

    document.querySelectorAll('#sizes .option').forEach(button => {
        button.classList.toggle('selected', button.dataset.v === state.sizeKey);
    });

    document.querySelectorAll('#drinks .option').forEach(button => {
        button.classList.toggle('selected', button.dataset.v === state.drinkKey);
    });

    document.querySelectorAll('#mixers .option').forEach(button => {
        const isCompatible = allowedMixers.includes(button.dataset.v);
        button.classList.toggle('selected', button.dataset.v === state.mixerKey);
        button.disabled = !isCompatible;
    });

    document.querySelectorAll('#shots input').forEach(input => {
        input.checked = Number(input.value) === state.shots;
        input.disabled = Number(input.value) > maxShots;
        input.parentElement.classList.toggle('off', input.disabled);
    });

    document.querySelectorAll('.checks input[type="checkbox"]').forEach(input => {
        input.checked = state.extras.includes(input.dataset.name);
    });

    const addOnPrice =
        Math.max(0, state.shots - 1) * 1000 +
        (state.mixerKey === 'Red Bull' ? 1500 : 0) +
        state.extras.reduce((total, name) => total + extraPrices[name], 0);
    const discount = state.sizeKey === 'party' && state.shots >= 3
        ? Math.round((basePrice + addOnPrice) * 0.1)
        : 0;
    const total = basePrice + addOnPrice - discount;
    const isValidOrder =
        allowedMixers.includes(state.mixerKey) &&
        state.shots <= maxShots;

    getElement('ss').textContent = sizeName;
    getElement('sd').textContent = state.drinkKey;
    getElement('sm').textContent = state.mixerKey;
    getElement('sn').textContent = state.shots;
    getElement('se').textContent = state.extras.join(', ') || 'Ninguno';
    getElement('base').textContent = formatMoney(basePrice);
    getElement('add').textContent = formatMoney(addOnPrice);
    getElement('disc').textContent = discount
        ? `-${formatMoney(discount)}`
        : formatMoney(0);
    getElement('total').textContent = formatMoney(total);
    getElement('promo').style.display = discount ? 'block' : 'none';
    getElement('compat').innerHTML = isValidOrder
        ? '<div class="notice ok">✓ Combinación disponible</div>'
        : '<div class="notice">⚠ Esta combinación no está disponible.</div>';
    getElement('valid').innerHTML = isValidOrder
        ? '<div class="notice ok">✓ Pedido listo para confirmar</div>'
        : '<div class="notice">⚠ Revisá las opciones seleccionadas.</div>';

    storeState();
    return { total, size: selectedSize, isValidOrder };
}

function send() {
    const order = render();

    if (!order.isValidOrder) {
        alert('Revisá las opciones seleccionadas antes de continuar.');
        return;
    }

    const message = `Hola, quiero pedir:

• ${order.size[0]}
• ${state.drinkKey}
• ${state.mixerKey}
• ${state.shots} miniatura${state.shots > 1 ? 's' : ''}
• ${state.extras.join(', ') || 'Sin extras'}

Total: ${formatMoney(order.total)}

¿Podrían confirmar disponibilidad?`;

    open(
        `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(message)}`,
        '_blank'
    );
}

function save() {
    const saved = storeState();
    alert(saved
        ? 'Tu previa quedó guardada en este dispositivo.'
        : 'No se pudo guardar la previa en este dispositivo.');
}

function contact(event) {
    event.preventDefault();

    const message = `Consulta de ${getElement('cn').value} (${getElement('ce').value}): ${getElement('cm').value}`;
    open(
        `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(message)}`,
        '_blank'
    );

    getElement('cs').innerHTML =
        '<div class="notice ok">✓ Abrimos WhatsApp para enviar tu consulta.</div>';
}

document.querySelectorAll('#shots input').forEach(input => {
    input.addEventListener('change', () => {
        state.shots = Number(input.value);
        render();
    });
});

try {
    const savedState = JSON.parse(localStorage.getItem(STORAGE_KEY));

    if (
        savedState &&
        sizes[savedState.sizeKey] &&
        compatibleMixers[savedState.drinkKey]?.includes(savedState.mixerKey)
    ) {
        state = {
            sizeKey: savedState.sizeKey,
            drinkKey: savedState.drinkKey,
            mixerKey: savedState.mixerKey,
            shots: Number(savedState.shots) || defaultState.shots,
            extras: Array.isArray(savedState.extras)
                ? savedState.extras
                    .map(extra => Array.isArray(extra) ? extra[0] : extra)
                    .filter(name => name in extraPrices)
                : defaultState.extras
        };
    }
} catch (error) {
    console.warn('No se pudo recuperar la previa guardada.', error);
}

render();

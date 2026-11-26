const SUPABASE_URL = 'https://huciunhiuabyyhdhxrct.supabase.co';
const SUPABASE_KEY = 'sb_publishable_R5lYwofT26LGS5i2E7ix4A_AQjFlVEX';

let products = [];

if (!window.supabase) {
    document.getElementById('loginMsg')?.replaceChildren('No se pudo cargar el cliente de Supabase.');
    throw new Error('Supabase CDN no disponible');
}

const supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);
const $ = (id) => document.getElementById(id);
const escapeHtml = (value) => String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');

async function logAuth(context) {
    const { data } = await supabaseClient.auth.getSession();
    const session = data.session;
    console.log('[HAY PREVIA Auth]', context, {
        authenticated: !!session,
        user: session?.user?.email || null
    });
    return session;
}

async function login() {
    const btn = $('loginBtn');
    const msg = $('loginMsg');
    const email = $('email').value.trim();
    const password = $('password').value;

    if (!email || !password) {
        msg.textContent = 'Completá email y contraseña.';
        msg.classList.remove('hidden');
        return;
    }

    btn.disabled = true;
    btn.textContent = 'Ingresando...';
    msg.classList.add('hidden');

    try {
        const { error } = await supabaseClient.auth.signInWithPassword({ email, password });
        if (error) {
            msg.textContent = error.message;
            msg.classList.remove('hidden');
            return;
        }
        await logAuth('después de signInWithPassword');
        await show();
    } catch (error) {
        msg.textContent = 'Error técnico: ' + (error?.message || 'respuesta inesperada de Supabase');
        msg.classList.remove('hidden');
    } finally {
        btn.disabled = false;
        btn.textContent = 'Ingresar';
    }
}

async function show() {
    const { data } = await supabaseClient.auth.getSession();
    if (!data.session) {
        $('login').classList.remove('hidden');
        $('app').classList.add('hidden');
        return;
    }

    $('login').classList.add('hidden');
    $('app').classList.remove('hidden');
    $('user').textContent = data.session.user.email;
    await loadProducts();
}

async function logout() {
    await supabaseClient.auth.signOut();
    await show();
}

function go(viewName) {
    document.querySelectorAll('.view').forEach((view) =>
        view.classList.toggle('active', view.id === viewName)
    );
    document.querySelectorAll('.nav button').forEach((button) =>
        button.classList.toggle('active', button.dataset.view === viewName)
    );
    $('title').textContent = viewName.charAt(0).toUpperCase() + viewName.slice(1);
}

document.querySelectorAll('.nav button').forEach((button) => {
    button.onclick = () => go(button.dataset.view);
});

$('loginForm').addEventListener('submit', (event) => {
    event.preventDefault();
    login();
});

$('rows').addEventListener('click', (event) => {
    const button = event.target.closest('button[data-id]');
    if (!button) return;
    if (button.classList.contains('js-delete')) deleteProduct(button.dataset.id);
    if (button.classList.contains('js-edit')) editProduct(button.dataset.id);
});

async function loadProducts() {
    const { data, error } = await supabaseClient
        .from('productos')
        .select('*')
        .order('created_at', { ascending: false });

    if (error) {
        $('productMsg').textContent = 'No se pudieron cargar los productos: ' + error.message;
        return;
    }

    products = data || [];
    renderTable();
    $('active').textContent = products.filter((product) => product.activo).length;
    $('low').textContent = products.filter((product) => Number(product.stock) <= 3).length;
}

function renderTable() {
    const query = ($('search')?.value || '').toLowerCase();
    const filtered = products.filter((product) =>
        (product.nombre || '').toLowerCase().includes(query)
    );

    $('rows').innerHTML = filtered.map((product) => `
        <tr>
            <td>${product.imagen
                ? `<img class="thumb" src="${escapeHtml(product.imagen)}" alt="">`
                : '—'}</td>
            <td><b>${escapeHtml(product.nombre)}</b></td>
            <td>$${escapeHtml(product.precio)}</td>
            <td>${escapeHtml(product.stock)}</td>
            <td>${escapeHtml(product.categoria || '—')}</td>
            <td><span class="pill ${product.activo ? '' : 'off'}">${product.activo ? 'Activo' : 'Inactivo'}</span></td>
            <td>
                <button type="button" class="ghost js-edit" data-id="${escapeHtml(product.id)}">Editar</button>
                <button type="button" class="danger js-delete" data-id="${escapeHtml(product.id)}">Eliminar</button>
            </td>
        </tr>
    `).join('') || '<tr><td colspan="7">No hay productos.</td></tr>';
}

async function deleteProduct(id) {
    const session = (await supabaseClient.auth.getSession()).data.session;
    if (!session) {
        $('productMsg').textContent = 'Sesión vencida. Volvé a ingresar.';
        return;
    }

    const product = products.find((item) => String(item.id) === String(id));
    if (!product) {
        $('productMsg').textContent = 'Producto no encontrado.';
        return;
    }
    if (!window.confirm('¿Eliminar ' + product.nombre + '?')) return;

    const { error } = await supabaseClient.from('productos').delete().eq('id', id);
    if (error) {
        console.error('[HAY PREVIA DELETE]', error);
        $('productMsg').textContent = 'No se pudo eliminar: ' + (error.message || 'Error de Supabase');
        return;
    }

    $('productMsg').textContent = 'Producto eliminado.';
    await loadProducts();
}

function newProduct() {
    $('editor').classList.remove('hidden');
    $('editorTitle').textContent = 'Crear producto';
    $('pid').value = '';
    $('pname').value = '';
    $('pprice').value = '';
    $('pstock').value = '0';
    $('pcat').value = '';
    $('pdesc').value = '';
    $('pimg').value = '';
    $('pactive').checked = true;
    $('productMsg').textContent = '';
}

function cancelProductEdit() {
    $('editor').classList.add('hidden');
    $('productMsg').textContent = '';
}

function editProduct(id) {
    const product = products.find((item) => String(item.id) === String(id));
    if (!product) return;

    newProduct();
    $('editorTitle').textContent = 'Editar producto';
    $('pid').value = product.id;
    $('pname').value = product.nombre || '';
    $('pprice').value = product.precio ?? 0;
    $('pstock').value = product.stock ?? 0;
    $('pcat').value = product.categoria || '';
    $('pdesc').value = product.descripcion || '';
    $('pimg').value = product.imagen || '';
    $('pactive').checked = !!product.activo;
}

async function saveProduct(event) {
    event.preventDefault();
    const session = (await supabaseClient.auth.getSession()).data.session;
    if (!session) {
        $('productMsg').textContent = 'Sesión vencida. Cerrá sesión y volvé a ingresar.';
        return;
    }

    const payload = {
        nombre: $('pname').value.trim(),
        precio: Number($('pprice').value),
        stock: Number($('pstock').value),
        categoria: $('pcat').value.trim(),
        descripcion: $('pdesc').value.trim(),
        imagen: $('pimg').value.trim() || null,
        activo: $('pactive').checked
    };

    const id = $('pid').value;
    const query = id
        ? supabaseClient.from('productos').update(payload).eq('id', id)
        : supabaseClient.from('productos').insert(payload);

    const { error } = await query;
    if (error) {
        $('productMsg').textContent = 'No se pudo guardar: ' + error.message;
        return;
    }

    $('productMsg').textContent = 'Guardado en Supabase.';
    $('editor').classList.add('hidden');
    await loadProducts();
}

supabaseClient.auth.onAuthStateChange((event) => {
    if (event === 'SIGNED_OUT') show();
});

show();

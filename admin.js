
// ==========================================
// PAWfect Treats - Administración con Supabase
// ==========================================

// IMPORTANTE: pega aquí el UID de tu usuario administrador.
// Es el mismo UUID que utilizaste al crear las políticas RLS.
const ADMIN_UID = "139d7200-0947-443d-8128-5f90463f090c";

// Elementos del HTML
const loginForm = document.getElementById("login-form");
const loginMessage = document.getElementById("login-message");
const adminLogin = document.getElementById("admin-login");
const adminPanel = document.getElementById("admin-panel");

const productForm = document.getElementById("product-form");
const productCount = document.getElementById("product-count");
const adminProductList = document.getElementById("admin-product-list");

const categorySelect = document.getElementById("product-category");

let categories = [];
let products = [];

// ==========================================
// INICIAR SESIÓN
// ==========================================

loginForm.addEventListener("submit", async (event) => {
    event.preventDefault();

    loginMessage.textContent = "Verificando acceso...";

    const email = document.getElementById("login-email").value.trim();
    const password = document.getElementById("login-password").value;

    const { data, error } = await supabaseClient.auth.signInWithPassword({
        email,
        password
    });

    if (error) {
        loginMessage.textContent = "No se pudo iniciar sesión. Revisa tus datos.";
        console.error(error);
        return;
    }

    if (data.user.id !== ADMIN_UID) {
        await supabaseClient.auth.signOut();
        loginMessage.textContent = "Este usuario no tiene permisos de administrador.";
        return;
    }

    loginMessage.textContent = "";
    await showAdminPanel();
});

// ==========================================
// MOSTRAR PANEL DE ADMINISTRACIÓN
// ==========================================

async function showAdminPanel() {
    const { data: sessionData, error: sessionError } =
        await supabaseClient.auth.getSession();

    if (sessionError || !sessionData.session) {
        adminLogin.hidden = false;
        adminPanel.hidden = true;
        return;
    }

    const user = sessionData.session.user;

    if (user.id !== ADMIN_UID) {
        await supabaseClient.auth.signOut();
        adminLogin.hidden = false;
        adminPanel.hidden = true;
        loginMessage.textContent = "No tienes permisos de administrador.";
        return;
    }

    adminLogin.hidden = true;
    adminPanel.hidden = false;

    await loadCategories();
    await loadProducts();
}

// ==========================================
// CERRAR SESIÓN
// ==========================================

const logoutButton = document.createElement("button");
logoutButton.type = "button";
logoutButton.textContent = "Cerrar sesión";
logoutButton.className = "main-button";

adminPanel.querySelector(".section-heading").appendChild(logoutButton);

logoutButton.addEventListener("click", async () => {
    await supabaseClient.auth.signOut();
    adminPanel.hidden = true;
    adminLogin.hidden = false;
    loginForm.reset();
    loginMessage.textContent = "Sesión cerrada.";
});

// ==========================================
// CARGAR CATEGORÍAS DESDE SUPABASE
// ==========================================

async function loadCategories() {
    const { data, error } = await supabaseClient
        .from("categories")
        .select("id, name")
        .order("id");

    if (error) {
        console.error("Error cargando categorías:", error);
        alert("No se pudieron cargar las categorías.");
        return;
    }

    categories = data || [];

    categorySelect.innerHTML =
        '<option value="">Selecciona una categoría</option>';

    categories.forEach(category => {
        const option = document.createElement("option");
        option.value = category.name;
        option.textContent = category.name;
        categorySelect.appendChild(option);
    });
}

// ==========================================
// CARGAR PRODUCTOS DESDE SUPABASE
// ==========================================

async function loadProducts() {
    const { data, error } = await supabaseClient
        .from("products")
        .select("*")
        .order("id", { ascending: false });

    if (error) {
        console.error("Error cargando productos:", error);
        alert("No se pudieron cargar los productos.");
        return;
    }

    products = (data || []).map(product => {
        const category = categories.find(
            item => item.id === product.category_id
        );

        return {
            ...product,
            category: category ? category.name : "",
            image: product.image_url || ""
        };
    });

    displayAdminProducts();
}

// ==========================================
// MOSTRAR PRODUCTOS
// ==========================================

function displayAdminProducts() {
    productCount.textContent = products.length;
    adminProductList.innerHTML = "";

    if (products.length === 0) {
        adminProductList.innerHTML = `
            <p class="empty-message">
                Todavía no has agregado productos.
            </p>
        `;
        return;
    }

    products.forEach(product => {
        const card = document.createElement("article");
        card.className = "product-card";

        if (product.image) {
            const image = document.createElement("img");
            image.src = product.image;
            image.alt = product.name;
            card.appendChild(image);
        }

        const name = document.createElement("h3");
        name.textContent = product.name;

        const description = document.createElement("p");
        description.textContent = product.description || "";

        const price = document.createElement("p");
        price.className = "product-price";
        price.textContent =
            `$${Number(product.price).toLocaleString("es-CO")}`;

        const editButton = document.createElement("button");
        editButton.type = "button";
        editButton.className = "edit-button";
        editButton.textContent = "Editar";

        const deleteButton = document.createElement("button");
        deleteButton.type = "button";
        deleteButton.className = "delete-button";
        deleteButton.textContent = "Eliminar";

        editButton.addEventListener("click", () => {
            document.getElementById("product-id").value = product.id;
            document.getElementById("product-name").value = product.name;
            document.getElementById("product-price").value = product.price;
            categorySelect.value = product.category;
            document.getElementById("product-description").value =
                product.description || "";

            document.getElementById("product-image").value =
                product.image.replace(/^images\//, "");

            document.getElementById("save-button").textContent =
                "Guardar cambios";

            productForm.scrollIntoView({ behavior: "smooth" });
        });

        deleteButton.addEventListener("click", async () => {
            if (!confirm(`¿Eliminar ${product.name}?`)) return;

            const { error } = await supabaseClient
                .from("products")
                .delete()
                .eq("id", product.id);

            if (error) {
                console.error(error);
                alert("No se pudo eliminar el producto.");
                return;
            }

            alert("Producto eliminado.");
            await loadProducts();
        });

        card.append(
            name,
            description,
            price,
            editButton,
            deleteButton
        );

        adminProductList.appendChild(card);
    });
}

// ==========================================
// GUARDAR O EDITAR PRODUCTOS
// ==========================================

productForm.addEventListener("submit", async (event) => {
    event.preventDefault();

    const id = document.getElementById("product-id").value;

    const categoryName = categorySelect.value;
    const selectedCategory = categories.find(
        category => category.name === categoryName
    );

    if (!selectedCategory) {
        alert("Selecciona una categoría válida.");
        return;
    }

    const imageName = document.getElementById("product-image")
        .value.trim();

    let imageUrl = imageName;

    if (imageName && !imageName.startsWith("images/") &&
        !imageName.startsWith("http")) {
        imageUrl = `images/${imageName}`;
    }

    const product = {
        name: document.getElementById("product-name").value.trim(),
        price: Number(document.getElementById("product-price").value),
        category_id: selectedCategory.id,
        description: document.getElementById("product-description").value.trim(),
        image_url: imageUrl || null,
        active: true
    };

    const saveButton = document.getElementById("save-button");
    saveButton.disabled = true;
    saveButton.textContent = "Guardando...";

    let result;

    if (id) {
        result = await supabaseClient
            .from("products")
            .update(product)
            .eq("id", Number(id));
    } else {
        result = await supabaseClient
            .from("products")
            .insert([product]);
    }

    saveButton.disabled = false;
    saveButton.textContent = id ? "Guardar cambios" : "Agregar producto";

    if (result.error) {
        console.error("Error guardando producto:", result.error);
        alert("No se pudo guardar el producto. Revisa los permisos y los datos.");
        return;
    }

    alert(id ? "Producto actualizado correctamente." :
        "Producto agregado correctamente.");

    productForm.reset();
    document.getElementById("product-id").value = "";
    saveButton.textContent = "Agregar producto";

    await loadProducts();
});

// ==========================================
// COMPROBAR SESIÓN AL ABRIR LA PÁGINA
// ==========================================

showAdminPanel();

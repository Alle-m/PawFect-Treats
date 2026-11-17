
// PAWfect Treats - Catálogo y carrito

const productList = document.getElementById("product-list");

// Los productos ahora se cargarán desde Supabase
let products = [];

function getProducts() {
    return products;
}

// CARGAR PRODUCTOS DESDE SUPABASE
async function loadProductsFromSupabase() {
    if (!productList) return;

    productList.innerHTML = "<p>Cargando productos...</p>";

    // Obtener categorías
    const { data: categoriesData, error: categoriesError } =
        await supabaseClient
            .from("categories")
            .select("id, name");

    if (categoriesError) {
        console.error("Error cargando categorías:", categoriesError);
        productList.innerHTML =
            "<p>No se pudieron cargar las categorías.</p>";
        return;
    }

    // Obtener productos activos
    const { data: productsData, error: productsError } =
        await supabaseClient
            .from("products")
            .select("*")
            .eq("active", true)
            .order("id", { ascending: false });

    if (productsError) {
        console.error("Error cargando productos:", productsError);
        productList.innerHTML =
            "<p>No se pudieron cargar los productos.</p>";
        return;
    }

    // Relacionar cada producto con su categoría
    products = (productsData || []).map(product => {
        const category = categoriesData.find(
            item => String(item.id) === String(product.category_id)
        );

        return {
            ...product,
            category: category ? category.name : "Sin categoría"
        };
    });

    displayProducts();

    // Conservar únicamente los productos que existen en Supabase
    const validIds = new Set(products.map(product => String(product.id)));

    const currentCart = getCart().filter(item =>
        validIds.has(String(item.id))
    );

    if (currentCart.length !== getCart().length) {
        saveCart(currentCart);
    } else {
        updateCart();
    }
}

function getCart() {
    return JSON.parse(localStorage.getItem("pawfectCart")) || [];
}

function saveCart(cart) {
    localStorage.setItem("pawfectCart", JSON.stringify(cart));
    updateCart();
}

function formatPrice(price) {
    return "$" + Number(price).toLocaleString("es-CO");
}

// MOSTRAR PRODUCTOS
function displayProducts(category = "Todos") {
    if (!productList) return;

    const products = getProducts();

    const filteredProducts = category === "Todos"
        ? products
        : products.filter(product => product.category === category);

    productList.innerHTML = "";

    if (filteredProducts.length === 0) {
        productList.innerHTML = `
            <p class="empty-message">
                Todavía no hay productos en esta categoría.
            </p>
        `;
        return;
    }

    filteredProducts.forEach(product => {
        const card = document.createElement("article");
        card.className = "product-card";

if (product.image_url) {
    const image = document.createElement("img");
    image.src = product.image_url;
    image.alt = product.name;
    card.appendChild(image);
}

        const name = document.createElement("h3");
        name.textContent = product.name;

        const description = document.createElement("p");
        description.textContent = product.description;

        const price = document.createElement("p");
        price.className = "product-price";
        price.textContent = formatPrice(product.price);

        const button = document.createElement("button");
        button.type = "button";
        button.className = "add-cart-button";
        button.textContent = "Agregar al carrito";

        button.addEventListener("click", () => {
            addToCart(product.id);
        });

        card.append(name, description, price, button);
        productList.appendChild(card);
    });
}

// FILTRAR POR CATEGORÍA
function filterProducts(category) {
    displayProducts(category);

    document.getElementById("productos")
        ?.scrollIntoView({ behavior: "smooth" });
}

// AGREGAR PRODUCTO AL CARRITO
function addToCart(productId) {
    const cart = getCart();
    const existingProduct = cart.find(item =>
    String(item.id) === String(productId)
);

    if (existingProduct) {
        existingProduct.quantity += 1;
    } else {
        cart.push({
            id: productId,
            quantity: 1
        });
    }

    saveCart(cart);
}

// ACTUALIZAR EL CARRITO
function updateCart() {
    const cart = getCart();
    const products = getProducts();

    const cartList = document.getElementById("cart-list");
    const cartCount = document.getElementById("cart-count");
    const cartItemsCount = document.getElementById("cart-items-count");
    const subtotalElement = document.getElementById("cart-subtotal");
    const totalElement = document.getElementById("cart-total");

    const totalItems = cart.reduce((sum, item) => sum + item.quantity, 0);

    if (cartCount) cartCount.textContent = totalItems;

    if (cartItemsCount) {
        cartItemsCount.textContent =
            `${totalItems} ${totalItems === 1 ? "producto" : "productos"}`;
    }

    if (!cartList) return;

    cartList.innerHTML = "";

    let total = 0;

    cart.forEach(item => {
        const product = products.find(product =>
    String(product.id) === String(item.id)
);

        if (!product) return;

        const itemTotal = Number(product.price) * item.quantity;
        total += itemTotal;

        const row = document.createElement("div");
        row.className = "cart-item";

        const details = document.createElement("div");

        const name = document.createElement("h3");
        name.textContent = product.name;

        const price = document.createElement("p");
        price.textContent = `${formatPrice(product.price)} c/u`;

        details.append(name, price);

        const quantity = document.createElement("span");
        quantity.textContent = `Cantidad: ${item.quantity}`;

        const controls = document.createElement("div");
        controls.className = "cart-controls";

        const decrease = document.createElement("button");
        decrease.type = "button";
        decrease.textContent = "−";
        decrease.setAttribute("aria-label", "Disminuir cantidad");
        decrease.addEventListener("click", () => changeQuantity(item.id, -1));

        const increase = document.createElement("button");
        increase.type = "button";
        increase.textContent = "+";
        increase.setAttribute("aria-label", "Aumentar cantidad");
        increase.addEventListener("click", () => changeQuantity(item.id, 1));

        const remove = document.createElement("button");
        remove.type = "button";
        remove.textContent = "Eliminar";
        remove.addEventListener("click", () => removeFromCart(item.id));

        controls.append(decrease, increase, remove);
        row.append(details, quantity, controls);
        cartList.appendChild(row);
    });

    if (cartList.children.length === 0) {
        cartList.innerHTML = `
            <p class="empty-message">
                Tu carrito está esperando algo delicioso.
            </p>
        `;
    }

    if (subtotalElement) subtotalElement.textContent = formatPrice(total);
    if (totalElement) totalElement.textContent = formatPrice(total);
}

// CAMBIAR CANTIDAD
function changeQuantity(productId, amount) {
    let cart = getCart();

    const item = cart.find(item =>
    String(item.id) === String(productId)
);
    if (!item) return;

    item.quantity += amount;

    if (item.quantity <= 0) {
        cart = cart.filter(item => item.id !== productId);
    }

    saveCart(cart);
}

// ELIMINAR DEL CARRITO
function removeFromCart(productId) {
    const cart = getCart().filter(item =>
    String(item.id) !== String(productId)
);
    saveCart(cart);
}


// INICIAR LA TIENDA
updateCart();
loadProductsFromSupabase();

// ABRIR Y CERRAR EL CARRITO DESPLEGABLE

const cartToggle = document.getElementById("cart-toggle");
const cartDropdown = document.getElementById("cart-dropdown");

if (cartToggle && cartDropdown) {

    cartToggle.addEventListener("click", () => {
        const isOpen = !cartDropdown.hidden;

        cartDropdown.hidden = isOpen;
        cartToggle.setAttribute("aria-expanded", String(!isOpen));
    });

    // Cerrar al hacer clic fuera del carrito
    document.addEventListener("click", (event) => {
        if (
            !cartDropdown.contains(event.target) &&
            !cartToggle.contains(event.target)
        ) {
            cartDropdown.hidden = true;
            cartToggle.setAttribute("aria-expanded", "false");
        }
    });

    // Cerrar al pulsar Escape
    document.addEventListener("keydown", (event) => {
        if (event.key === "Escape") {
            cartDropdown.hidden = true;
            cartToggle.setAttribute("aria-expanded", "false");
        }
    });
}




// ================================
// PAWFECT ASSISTANT
// ================================

const assistantToggle = document.getElementById("assistant-toggle");
const assistantChat = document.getElementById("assistant-chat");
const assistantClose = document.getElementById("assistant-close");

const recommendButton = document.getElementById("recommend-button");
const recommendationResult = document.getElementById("recommendation-result");

// ABRIR Y CERRAR EL CHAT

if (assistantToggle && assistantChat) {
    assistantToggle.addEventListener("click", () => {
        assistantChat.hidden = !assistantChat.hidden;
    });
}

if (assistantClose && assistantChat) {
    assistantClose.addEventListener("click", () => {
        assistantChat.hidden = true;
    });
}

// BUSCAR RECOMENDACIONES

if (recommendButton) {
    recommendButton.addEventListener("click", () => {

        const petType = document.getElementById("pet-type").value;
        const occasion = document.getElementById("pet-occasion").value;
        const preference = document.getElementById("pet-preference").value;
        const allergies = document.getElementById("pet-allergies").value.trim();

        if (!petType || !occasion || !preference || !allergies) {
            recommendationResult.textContent =
                "Por favor, completa todos los campos para continuar.";
            return;
        }

        const products = getProducts();

        if (products.length === 0) {
            recommendationResult.textContent =
                "En este momento no tenemos productos disponibles.";
            return;
        }

        if (allergies.toLowerCase() !== "ninguna") {
            recommendationResult.textContent =
                "Gracias por contarnos. Antes de recomendarte un producto, necesitamos verificar sus ingredientes para asegurarnos de que sea adecuado para tu mascota.";
            return;
        }

        let matchingProducts = products;

        // FILTRAR POR CATEGORÍA

        if (preference !== "Todos") {
            matchingProducts = matchingProducts.filter(product =>
                String(product.category).toLowerCase() === preference.toLowerCase()
            );
        }

        if (matchingProducts.length === 0) {
            recommendationResult.textContent =
                "No encontramos productos de esa categoría por ahora. Prueba seleccionando otra opción.";
            return;
        }

        // AJUSTAR RECOMENDACIÓN SEGÚN LA OCASIÓN

        let message = "";

        if (occasion === "Cumpleaños") {
            message = "¡Un cumpleaños merece algo especial!";
        } else if (occasion === "Celebración especial") {
            message = "¡Tenemos opciones para celebrar ese momento!";
        } else if (occasion === "Premio") {
            message = "¡Un detalle delicioso para consentir a tu mascota!";
        } else {
            message = "¡A veces no hace falta una ocasión para dar un gusto!";
        }

        recommendationResult.innerHTML = "";

        const heading = document.createElement("h4");
        heading.textContent = message + " Ideas para tu " + petType.toLowerCase() + ":";

        recommendationResult.appendChild(heading);

        matchingProducts.forEach(product => {
            const productCard = document.createElement("div");
            productCard.className = "assistant-recommendation";

            const name = document.createElement("strong");
            name.textContent = product.name;

            const price = document.createElement("p");
            price.textContent = formatPrice(product.price);

            const addButton = document.createElement("button");
            addButton.textContent = "Agregar al carrito";

            addButton.addEventListener("click", () => {
                addToCart(product.id);

                recommendationResult.querySelectorAll(
                    ".assistant-added"
                ).forEach(message => message.remove());

                const confirmation = document.createElement("p");
                confirmation.className = "assistant-added";
                confirmation.textContent = "¡Producto agregado al carrito!";

                productCard.appendChild(confirmation);
            });

            productCard.append(name, price, addButton);
            recommendationResult.appendChild(productCard);
        });

        const notice = document.createElement("p");
        notice.textContent =
            "Recuerda revisar los ingredientes de cada producto antes de ofrecérselo a tu mascota.";

        recommendationResult.appendChild(notice);
    });
}

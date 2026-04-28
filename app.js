const dishGrid = document.querySelector("#dish-grid");
const categoryFilters = document.querySelector("#category-filters");
const activeFilters = document.querySelector("#active-filters");
const searchInput = document.querySelector("#search-input");
const cartList = document.querySelector("#cart-list");
const cartBadge = document.querySelector("#cart-badge");
const orderForm = document.querySelector("#order-form");
const ordersList = document.querySelector("#orders-list");
const ordersSummary = document.querySelector("#orders-summary");
const addDishButton = document.querySelector("#add-dish-button");
const clearFiltersButton = document.querySelector("#clear-filters-button");
const exportOrdersButton = document.querySelector("#export-orders");
const clearOrdersButton = document.querySelector("#clear-orders");

const detailDialog = document.querySelector("#detail-dialog");
const detailDialogPanel = document.querySelector("#detail-dialog-panel");
const closeDetailDialogButton = document.querySelector("#close-detail-dialog");

const editorDialog = document.querySelector("#editor-dialog");
const editorDialogPanel = document.querySelector("#editor-dialog-panel");
const closeEditorDialogButton = document.querySelector("#close-editor-dialog");
const desktopBridge = window.menuDesktopApi || null;

const storageKeys = {
  dishes: "maison-menu-dishes-v3",
  orders: "maison-menu-orders-v3"
};

const curatedCategories = ["全部", "招牌菜", "凉菜", "素菜", "荤菜", "西餐", "汤羹", "主食", "酒水"];
const categoryInputOptions = curatedCategories.filter((category) => category !== "全部");
const meatPattern =
  /牛|羊|猪|鸡|鸭|鹅|肉|排骨|肥牛|牛腩|虾|鱼|海鲜|贝|蟹|火腿|培根|香肠|金枪鱼|鸡腿|鸡胸|鸡翅|鳕鱼|三文鱼/;
const westernPattern = /意面|法棍|吐司|三明治|披萨|焗|咖喱|葡式|奶油|西餐|欧芹|黄油|芝士/;
const staplePattern = /饭|面|粉|粥|吐司|三明治|法棍|意面|米饭|盖饭|炒饭|焗饭|饼|主食/;
const soupPattern = /汤|羹|粥/;
const coldPattern = /凉|冷|拌|沙拉/;
const veggiePattern = /素|豆腐|蔬菜|蔬食|菌|菇|茄子|黄瓜|番茄|土豆|西兰花|白菜|生菜|玉米|法棍|吐司|沙拉/;
const drinksPattern = /茶|咖啡|拿铁|美式|果汁|饮|汽水|可乐|苏打|啤酒|红酒|白酒|鸡尾酒|威士忌|龙茶|奶茶|酒水/;

const palettes = {
  招牌菜: "linear-gradient(135deg, rgba(231, 162, 141, 0.95), rgba(138, 84, 70, 0.9))",
  凉菜: "linear-gradient(135deg, rgba(187, 216, 178, 0.95), rgba(104, 139, 96, 0.9))",
  素菜: "linear-gradient(135deg, rgba(216, 228, 189, 0.95), rgba(128, 149, 94, 0.9))",
  荤菜: "linear-gradient(135deg, rgba(214, 150, 127, 0.95), rgba(122, 74, 60, 0.9))",
  西餐: "linear-gradient(135deg, rgba(236, 195, 145, 0.95), rgba(161, 116, 76, 0.9))",
  汤羹: "linear-gradient(135deg, rgba(239, 208, 166, 0.95), rgba(177, 132, 92, 0.9))",
  主食: "linear-gradient(135deg, rgba(223, 185, 149, 0.95), rgba(150, 108, 78, 0.9))",
  酒水: "linear-gradient(135deg, rgba(235, 197, 167, 0.95), rgba(175, 118, 95, 0.9))"
};

const categoryMeta = {
  全部: { icon: "./assets/category-icons/all.svg", label: "今日推荐", note: "先看招牌好味" },
  招牌菜: { icon: "./assets/category-icons/signature.svg", label: "招牌热菜", note: "主厨偏爱的香气" },
  凉菜: { icon: "./assets/category-icons/cold.svg", label: "清新凉拌", note: "开胃清爽一口" },
  素菜: { icon: "./assets/category-icons/vegetable.svg", label: "时蔬小味", note: "轻盈也很满足" },
  荤菜: { icon: "./assets/category-icons/meat.svg", label: "肉香主菜", note: "想吃点扎实的" },
  西餐: { icon: "./assets/category-icons/western.svg", label: "欧陆风味", note: "慢食与奶香" },
  汤羹: { icon: "./assets/category-icons/soup.svg", label: "暖汤羹品", note: "热乎乎的一碗" },
  主食: { icon: "./assets/category-icons/staple.svg", label: "米面主食", note: "饱腹安心之选" },
  酒水: { icon: "./assets/category-icons/drinks.svg", label: "微醺酒水", note: "饮品也要有气氛" }
};

const cart = new Map();
const state = {
  search: "",
  category: "全部",
  tag: "",
  ingredient: ""
};

const editorState = {
  mode: "create",
  dishId: null
};

const initialDishes = Array.isArray(window.menuData) ? window.menuData : [];
let dishes = initialDishes.map(normalizeDish);
let orders = [];

function deepClone(value) {
  return JSON.parse(JSON.stringify(value));
}

function slugifyName(name) {
  return String(name || "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9\u4e00-\u9fa5]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function parseList(value) {
  if (Array.isArray(value)) {
    return value.map((item) => String(item).trim()).filter(Boolean);
  }

  return String(value || "")
    .split(/[\n,，]/)
    .map((item) => item.trim())
    .filter(Boolean);
}

function clampRating(value) {
  const number = Number(value);
  if (Number.isNaN(number)) {
    return 4;
  }

  return Math.max(1, Math.min(5, Math.round(number)));
}

function dishDefaults() {
  return {
    id: "",
    name: "",
    category: "招牌菜",
    description: "",
    ingredients: [],
    tags: [],
    difficulty: "简单",
    time: 20,
    servings: "2 人份",
    spice: "不辣",
    calories: "适中",
    image: "",
    accent: "",
    rating: 4,
    steps: [""],
    tips: ""
  };
}

function resolveAccent(dish) {
  if (dish.accent) {
    return dish.accent;
  }

  return palettes[getDisplayCategory(dish)] || palettes["招牌菜"];
}

function getDishSearchText(dish) {
  return [
    dish.name,
    dish.category,
    dish.description,
    dish.spice,
    dish.difficulty,
    ...dish.tags,
    ...dish.ingredients
  ]
    .join(" ")
    .toLowerCase();
}

function getDerivedCategories(dish) {
  const rawCategory = String(dish.category || "").trim();
  const text = getDishSearchText(dish);
  const matches = new Set();
  const hasMeat = meatPattern.test(text);
  const isSoup = soupPattern.test(text) || rawCategory === "汤品";
  const isCold = coldPattern.test(text);
  const isWestern = westernPattern.test(text);
  const isStaple = staplePattern.test(text) || rawCategory === "盖饭";
  const isDrink = drinksPattern.test(text);
  const isVegetarian = !hasMeat && (veggiePattern.test(text) || rawCategory === "素菜");

  if (curatedCategories.includes(rawCategory) && rawCategory !== "全部") {
    matches.add(rawCategory);
  }

  if (dish.rating >= 5 || /招牌|推荐|经典|人气|top|必点|硬菜/.test(text)) {
    matches.add("招牌菜");
  }

  if (isCold) {
    matches.add("凉菜");
  }

  if (isVegetarian || /豆腐|蔬菜|法棍|吐司|沙拉|菌|菇/.test(text)) {
    matches.add("素菜");
  }

  if (hasMeat) {
    matches.add("荤菜");
  }

  if (isWestern) {
    matches.add("西餐");
  }

  if (isSoup) {
    matches.add("汤羹");
  }

  if (isStaple) {
    matches.add("主食");
  }

  if (isDrink) {
    matches.add("酒水");
  }

  if (!matches.size) {
    matches.add(hasMeat ? "荤菜" : "素菜");
  }

  return matches;
}

function getDisplayCategory(dish) {
  const rawCategory = String(dish.category || "").trim();
  if (categoryInputOptions.includes(rawCategory)) {
    return rawCategory;
  }

  if (rawCategory === "盖饭") {
    return "主食";
  }

  if (rawCategory === "汤品") {
    return "汤羹";
  }

  if (rawCategory === "酒水") {
    return "酒水";
  }

  if (rawCategory === "轻食") {
    return "素菜";
  }

  if (rawCategory === "主菜" || rawCategory === "家常菜") {
    return "荤菜";
  }

  return "招牌菜";
}

function matchesCategoryFilter(dish, category) {
  if (category === "全部") {
    return true;
  }

  return getDisplayCategory(dish) === category;
}

function normalizeDish(dish) {
  const merged = { ...dishDefaults(), ...dish };
  const trimmedName = String(merged.name || "").trim();
  const normalizedCategory = getDisplayCategory(merged);

  return {
    id: merged.id || `dish-${slugifyName(trimmedName) || Date.now()}`,
    name: trimmedName || "未命名菜品",
    category: normalizedCategory,
    description: String(merged.description || "").trim(),
    ingredients: parseList(merged.ingredients),
    tags: parseList(merged.tags),
    difficulty: String(merged.difficulty || "简单").trim() || "简单",
    time: Math.max(1, Number(merged.time) || 20),
    servings: String(merged.servings || "2 人份").trim() || "2 人份",
    spice: String(merged.spice || "不辣").trim() || "不辣",
    calories: String(merged.calories || "适中").trim() || "适中",
    image: String(merged.image || "").trim(),
    accent: resolveAccent(merged),
    rating: clampRating(merged.rating),
    steps: parseList(merged.steps).length ? parseList(merged.steps) : [""],
    tips: String(merged.tips || "").trim()
  };
}

async function loadDishes() {
  if (desktopBridge?.loadDishes) {
    try {
      const desktopDishes = await desktopBridge.loadDishes();
      if (Array.isArray(desktopDishes) && desktopDishes.length) {
        return desktopDishes.map(normalizeDish);
      }
    } catch (error) {
      console.error("Failed to load dishes from desktop storage:", error);
    }
  }

  try {
    const raw = JSON.parse(localStorage.getItem(storageKeys.dishes) || "null");
    if (Array.isArray(raw) && raw.length) {
      return raw.map(normalizeDish);
    }
  } catch (error) {
    // Ignore invalid storage and fall back to seed data.
  }

  return initialDishes.map(normalizeDish);
}

async function saveDishes(nextDishes = dishes) {
  if (desktopBridge?.saveDishes) {
    await desktopBridge.saveDishes(nextDishes);
    return;
  }

  localStorage.setItem(storageKeys.dishes, JSON.stringify(nextDishes));
}

async function loadOrders() {
  if (desktopBridge?.loadOrders) {
    try {
      const desktopOrders = await desktopBridge.loadOrders();
      if (Array.isArray(desktopOrders)) {
        return desktopOrders;
      }
    } catch (error) {
      console.error("Failed to load orders from desktop storage:", error);
    }
  }

  try {
    return JSON.parse(localStorage.getItem(storageKeys.orders) || "[]");
  } catch (error) {
    return [];
  }
}

async function saveOrders(nextOrders) {
  if (desktopBridge?.saveOrders) {
    await desktopBridge.saveOrders(nextOrders);
    return;
  }

  localStorage.setItem(storageKeys.orders, JSON.stringify(nextOrders));
}

function formatTime(minutes) {
  return `${minutes} 分钟`;
}

function getSpiceLevel(spice) {
  const normalized = String(spice || "").trim();
  const levels = {
    不辣: 0,
    微辣: 1,
    小辣: 2,
    中辣: 3,
    大辣: 4,
    爆辣: 5
  };

  return levels[normalized] ?? 0;
}

function renderSpiceIndicator(spice) {
  const normalized = String(spice || "").trim() || "不辣";
  const level = getSpiceLevel(normalized);

  if (level <= 0) {
    return '<span class="spice-indicator spice-indicator--none">不辣</span>';
  }

  return `
    <span class="spice-indicator" aria-label="${escapeHtml(normalized)}" title="${escapeHtml(normalized)}">
      ${Array.from({ length: level }, () => '<span class="spice-indicator__pepper">🌶</span>').join("")}
    </span>
  `;
}

function formatSpiceText(spice) {
  const normalized = String(spice || "").trim() || "不辣";
  const level = getSpiceLevel(normalized);

  if (level <= 0) {
    return "不辣";
  }

  return "🌶".repeat(level);
}

function renderStars(rating) {
  return `${"★".repeat(rating)}${"☆".repeat(5 - rating)}`;
}

function showToast(message) {
  const toast = document.createElement("div");
  toast.className = "toast";
  toast.textContent = message;
  document.body.appendChild(toast);

  window.setTimeout(() => {
    toast.remove();
  }, 2200);
}

function escapeHtml(text) {
  return String(text)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function normalizeImageSource(source) {
  const value = String(source || "").trim();
  if (!value) {
    return "";
  }

  if (/^(https?:|data:|file:)/.test(value)) {
    return value;
  }

  if (value.startsWith("/")) {
    return encodeURI(`file://${value}`);
  }

  return value;
}

function getDishImageSource(dish) {
  return normalizeImageSource(dish.image);
}

function isInlineImageSource(source) {
  return /^data:image\//.test(String(source || "").trim());
}

function isLocalFileImageSource(source) {
  const value = String(source || "").trim();
  return value.startsWith("/") || value.startsWith("file://");
}

function isRelativeImageSource(source) {
  const value = String(source || "").trim();
  if (!value) {
    return false;
  }

  return !/^(https?:|data:|file:)/.test(value) && !value.startsWith("/");
}

function getDishVisual(dish) {
  const normalized = getDishImageSource(dish);
  return normalized ? `url("${normalized}")` : dish.accent;
}

function renderDishShowcaseMedia(imageSource, altText, accentStyle) {
  return `
    <div class="dish-showcase__media${imageSource ? " has-image" : ""}">
      ${
        imageSource
          ? `<img class="dish-showcase__image" src="${escapeHtml(imageSource)}" alt="${escapeHtml(altText)}" />`
          : `<div class="dish-showcase__fallback" style="background-image:${accentStyle};">
              <span>图片待补</span>
            </div>`
      }
    </div>
  `;
}

function getDishById(dishId) {
  return dishes.find((dish) => dish.id === dishId);
}

function getCategories() {
  return curatedCategories;
}

function getVisibleDishes() {
  const keyword = state.search.trim().toLowerCase();

  return dishes.filter((dish) => {
    const matchesCategory = matchesCategoryFilter(dish, state.category);
    const matchesTag = !state.tag || dish.tags.includes(state.tag);
    const matchesIngredient = !state.ingredient || dish.ingredients.includes(state.ingredient);
    const haystack = getDishSearchText(dish);
    const matchesSearch = !keyword || haystack.includes(keyword);

    return matchesCategory && matchesTag && matchesIngredient && matchesSearch;
  });
}

function setFilter(type, value) {
  if (type === "category") {
    state.category = state.category === value ? "全部" : value;
    return;
  }

  if (type === "tag") {
    state.tag = state.tag === value ? "" : value;
    return;
  }

  if (type === "ingredient") {
    state.ingredient = state.ingredient === value ? "" : value;
  }
}

function clearFilters() {
  state.search = "";
  state.category = "全部";
  state.tag = "";
  state.ingredient = "";
  searchInput.value = "";
  renderAll();
}

function renderCategoryFilters() {
  categoryFilters.innerHTML = "";

  getCategories().forEach((category) => {
    const meta = categoryMeta[category] || { icon: "•", label: category, note: "菜单分类" };
    const button = document.createElement("button");
    button.className = `filter-chip filter-chip--nav${state.category === category ? " is-active" : ""}`;
    button.type = "button";
    button.innerHTML = `
      <span class="filter-chip__icon">
        ${
          String(meta.icon).endsWith(".svg")
            ? `<img src="${meta.icon}" alt="" />`
            : meta.icon
        }
      </span>
      <span class="filter-chip__content">
        <strong>${meta.label || category}</strong>
        <em>${meta.note}</em>
      </span>
    `;
    button.addEventListener("click", () => {
      setFilter("category", category);
      renderAll();
    });
    categoryFilters.appendChild(button);
  });
}

function renderActiveFilters() {
  activeFilters.innerHTML = "";
  const entries = [];

  if (state.category !== "全部") {
    entries.push({ label: `分类：${state.category}`, type: "category", value: state.category });
  }

  if (state.tag) {
    entries.push({ label: `标签：${state.tag}`, type: "tag", value: state.tag });
  }

  if (state.ingredient) {
    entries.push({ label: `食材：${state.ingredient}`, type: "ingredient", value: state.ingredient });
  }

  if (!entries.length) {
    const hint = document.createElement("p");
    hint.className = "editor-hint";
    hint.textContent = "点击卡片上的分类、标签或食材，可以快速缩小菜单范围。";
    activeFilters.appendChild(hint);
    return;
  }

  entries.forEach((entry) => {
    const button = document.createElement("button");
    button.className = "filter-chip is-active";
    button.type = "button";
    button.textContent = entry.label;
    button.addEventListener("click", () => {
      setFilter(entry.type, entry.value);
      renderAll();
    });
    activeFilters.appendChild(button);
  });
}

function createInfoChip(label, className, type, value) {
  const button = document.createElement("button");
  button.type = "button";
  button.className = `info-chip ${className}`.trim();
  const isActive =
    (type === "category" && state.category === value) ||
    (type === "tag" && state.tag === value) ||
    (type === "ingredient" && state.ingredient === value);

  if (isActive) {
    button.classList.add("is-active");
  }

  button.textContent = label;
  button.addEventListener("click", (event) => {
    event.stopPropagation();
    setFilter(type, value);
    renderAll();
  });
  return button;
}

function renderDishes() {
  const template = document.querySelector("#dish-card-template");
  const visibleDishes = getVisibleDishes();

  dishGrid.innerHTML = "";

  if (!visibleDishes.length) {
    const empty = document.createElement("div");
    empty.className = "editor-empty";
    empty.textContent = "没有匹配到菜品，试试别的关键词。";
    dishGrid.appendChild(empty);
    return;
  }

  visibleDishes.forEach((dish) => {
    const node = template.content.firstElementChild.cloneNode(true);
    const media = node.querySelector(".dish-card__media");
    const titleNode = node.querySelector("h3");
    const ratingNode = node.querySelector(".dish-card__rating");
    const timeNode = node.querySelector(".dish-card__time");
    const difficultyNode = node.querySelector(".dish-card__difficulty");
    const spiceNode = node.querySelector(".dish-card__spice");
    const chipRow = node.querySelector(".chip-row");
    const excerptNode = node.querySelector(".dish-card__excerpt");
    const addButton = node.querySelector(".dish-add-button");

    media.style.backgroundImage = `
      linear-gradient(180deg, rgba(255, 255, 255, 0.04), rgba(53, 34, 24, 0.22)),
      ${getDishVisual(dish)}
    `;
    if (dish.image) {
      media.classList.add("has-image");
    }
    media.setAttribute("aria-label", `查看${dish.name}详情`);

    titleNode.textContent = dish.name;
    ratingNode.innerHTML = `<span class="rating-badge">${renderStars(dish.rating)}</span>`;
    timeNode.textContent = formatTime(dish.time);
    difficultyNode.textContent = dish.difficulty;
    spiceNode.innerHTML = renderSpiceIndicator(dish.spice);
    excerptNode.textContent = dish.description || "这道菜适合加入今晚菜单。";

    const displayCategory = getDisplayCategory(dish);
    chipRow.appendChild(createInfoChip(displayCategory, "", "category", displayCategory));
    dish.tags
      .filter((tag) => tag !== dish.category)
      .slice(0, 1)
      .forEach((tag) => {
        chipRow.appendChild(createInfoChip(tag, "is-tag", "tag", tag));
      });
    dish.ingredients.slice(0, 1).forEach((ingredient) => {
      chipRow.appendChild(createInfoChip(ingredient, "is-ingredient", "ingredient", ingredient));
    });

    media.addEventListener("click", () => openDetailDialog(dish.id));
    addButton.addEventListener("click", () => {
      updateCart(dish.id, 1);
      showToast(`已加入 ${dish.name}`);
    });

    dishGrid.appendChild(node);
  });
}

function updateCart(dishId, delta) {
  const current = cart.get(dishId) || 0;
  const next = current + delta;

  if (next <= 0) {
    cart.delete(dishId);
  } else {
    cart.set(dishId, next);
  }

  renderCart();
}

function renderCart() {
  const template = document.querySelector("#cart-item-template");
  const items = Array.from(cart.entries());
  cartList.innerHTML = "";

  if (!items.length) {
    const empty = document.createElement("div");
    empty.className = "cart-empty";
    empty.textContent = "选中的菜会实时出现在这里，像餐厅点单一样随时调整。";
    cartList.appendChild(empty);
  }

  items.forEach(([dishId, quantity]) => {
    const dish = getDishById(dishId);
    if (!dish) {
      return;
    }

    const node = template.content.firstElementChild.cloneNode(true);
    const thumb = node.querySelector(".cart-item__thumb");
    const title = node.querySelector("h3");
    const quantityNode = node.querySelector(".cart-item__quantity");
    const [decreaseButton, increaseButton] = node.querySelectorAll(".quantity-button");

    thumb.style.backgroundImage = `
      linear-gradient(180deg, rgba(255, 255, 255, 0.04), rgba(53, 34, 24, 0.18)),
      ${getDishVisual(dish)}
    `;
    title.textContent = dish.name;
    quantityNode.textContent = quantity;

    decreaseButton.addEventListener("click", () => updateCart(dishId, -1));
    increaseButton.addEventListener("click", () => updateCart(dishId, 1));

    cartList.appendChild(node);
  });

  const totalCount = items.reduce((sum, [, quantity]) => sum + quantity, 0);
  cartBadge.textContent = `${totalCount} 道`;
}

function renderOrders() {
  const template = document.querySelector("#order-item-template");
  ordersList.innerHTML = "";

  if (!orders.length) {
    const empty = document.createElement("div");
    empty.className = "orders-empty";
    empty.textContent = "还没有新的点单记录。";
    ordersList.appendChild(empty);
  }

  orders
    .slice()
    .reverse()
    .forEach((order) => {
      const node = template.content.firstElementChild.cloneNode(true);
      const title = node.querySelector("h3");
      const meta = node.querySelector(".order-item__meta");
      const slot = node.querySelector(".order-item__slot");
      const dishesRow = node.querySelector(".order-item__dishes");
      const note = node.querySelector(".order-item__note");

      title.textContent = order.customerName;
      meta.textContent = `${order.createdAt} · 共 ${order.totalCount} 道`;
      slot.textContent = order.mealSlot;
      note.textContent = order.note ? `备注：${order.note}` : "备注：无";

      order.items.forEach((item) => {
        const chip = document.createElement("span");
        chip.className = "order-dish-chip";
        chip.textContent = `${item.name} × ${item.quantity}`;
        dishesRow.appendChild(chip);
      });

      ordersList.appendChild(node);
    });

  renderOrderSummary(orders);
}

function renderOrderSummary(orders) {
  const totalDishes = orders.reduce((sum, order) => sum + order.totalCount, 0);
  const totalPrepMinutes = orders.reduce((sum, order) => sum + order.totalMinutes, 0);

  ordersSummary.innerHTML = `
    <div class="summary-card">
      <span>菜数</span>
      <strong>${totalDishes}</strong>
    </div>
    <div class="summary-card">
      <span>备餐</span>
      <strong>${totalPrepMinutes} 分钟</strong>
    </div>
  `;
}

function updateOverviewStats() {
  return;
}

async function submitOrder(event) {
  event.preventDefault();

  if (!cart.size) {
    showToast("请先选择至少一道菜。");
    return;
  }

  const formData = new FormData(orderForm);
  const items = Array.from(cart.entries()).map(([dishId, quantity]) => {
    const dish = getDishById(dishId);
    return {
      id: dishId,
      name: dish.name,
      quantity,
      time: dish.time
    };
  });

  const totalCount = items.reduce((sum, item) => sum + item.quantity, 0);
  const totalMinutes = items.reduce((sum, item) => sum + item.time * item.quantity, 0);
  const now = new Date();
  const createdAt = `${now.getFullYear()}/${String(now.getMonth() + 1).padStart(2, "0")}/${String(now.getDate()).padStart(2, "0")} ${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;
  const order = {
    id: now.getTime(),
    customerName: "今日点单",
    mealSlot: String(formData.get("mealSlot") || "晚餐").trim() || "晚餐",
    note: String(formData.get("note")).trim(),
    items,
    totalCount,
    totalMinutes,
    createdAt
  };

  const nextOrders = [...orders, order];

  try {
    await saveOrders(nextOrders);
    orders = nextOrders;
  } catch (error) {
    console.error("Failed to save orders:", error);
    showToast("点单保存失败，请稍后再试。");
    return;
  }

  cart.clear();
  orderForm.reset();
  renderCart();
  renderOrders();
  showToast("点单已提交，点单表已更新。");
}

function exportOrders() {
  if (!orders.length) {
    showToast("还没有可导出的点单内容。");
    return;
  }

  const lines = orders.map((order, index) => {
    const dishLine = order.items.map((item) => `${item.name} x${item.quantity}`).join("、");
    return `${index + 1}. ${order.customerName}｜${order.mealSlot}｜${dishLine}｜备注：${order.note || "无"}`;
  });

  const content = `今日点单摘要\n${lines.join("\n")}`;
  if (navigator.clipboard && window.isSecureContext) {
    navigator.clipboard.writeText(content).then(() => {
      showToast("点单摘要已复制到剪贴板。");
    });
    return;
  }

  const blob = new Blob([content], { type: "text/plain;charset=utf-8" });
  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.download = "今日点单摘要.txt";
  link.click();
  URL.revokeObjectURL(link.href);
  showToast("浏览器已下载点单摘要文件。");
}

async function clearOrders() {
  if (!orders.length) {
    showToast("点单表已经是空的。");
    return;
  }

  if (!window.confirm("确认清空右下角点单表里的全部记录吗？")) {
    return;
  }

  try {
    await saveOrders([]);
    orders = [];
    renderOrders();
    showToast("点单表已清空。");
  } catch (error) {
    console.error("Failed to clear orders:", error);
    showToast("清空点单表失败，请稍后再试。");
  }
}

function openDetailDialog(dishId) {
  const dish = getDishById(dishId);
  if (!dish) {
    return;
  }

  const detailImage = getDishImageSource(dish);

  detailDialogPanel.innerHTML = `
    <div class="detail-view">
      <div class="detail-view__hero">
        ${renderDishShowcaseMedia(detailImage, dish.name, resolveAccent(dish))}
        <div class="dish-showcase__content">
          <p class="section-label">Dish Detail</p>
          <h2>${escapeHtml(dish.name)}</h2>
          <p class="detail-view__copy">${escapeHtml(dish.description || "这道菜目前还没有补充简介。")}</p>
          <div class="detail-view__hero-meta">
            <span>${escapeHtml(getDisplayCategory(dish))}</span>
            <span>${formatTime(dish.time)}</span>
            <span>${escapeHtml(dish.difficulty)}</span>
            <span>${escapeHtml(formatSpiceText(dish.spice))}</span>
            <span>${escapeHtml(renderStars(dish.rating))}</span>
          </div>
        </div>
      </div>
      <div class="detail-view__content">
        <div class="detail-view__grid">
          <div class="detail-view__panel">
            <div class="detail-view__section-head">
              <h3>基础信息</h3>
            </div>
            <div class="detail-chip-row">
              <span class="detail-chip">${escapeHtml(dish.servings)}</span>
              <span class="detail-chip">${escapeHtml(dish.calories)}</span>
              <span class="detail-chip">${escapeHtml(formatSpiceText(dish.spice))}</span>
            </div>
          </div>
          <div class="detail-view__panel">
            <div class="detail-view__section-head">
              <h3>标签</h3>
            </div>
            <div class="detail-chip-row">
              ${dish.tags.length ? dish.tags.map((tag) => `<span class="detail-chip is-tag">${escapeHtml(tag)}</span>`).join("") : '<span class="detail-chip">暂无标签</span>'}
            </div>
          </div>
        </div>

        <div class="detail-view__panel">
          <div class="detail-view__section-head">
            <div>
              <h3>主要食材</h3>
              <p>备菜时直接照这个列表准备</p>
            </div>
          </div>
          <div class="detail-chip-row">
            ${dish.ingredients.length ? dish.ingredients.map((ingredient) => `<span class="detail-chip is-ingredient">${escapeHtml(ingredient)}</span>`).join("") : '<span class="detail-chip">暂无食材</span>'}
          </div>
        </div>

        <div class="detail-view__panel">
          <div class="detail-view__section-head">
            <h3>做法步骤</h3>
          </div>
          <ol class="detail-step-list">
            ${dish.steps.map((step) => `<li>${escapeHtml(step)}</li>`).join("")}
          </ol>
        </div>

        <div class="detail-view__panel">
          <div class="detail-view__section-head">
            <div>
              <h3>烹饪备注</h3>
            </div>
          </div>
          <p class="detail-view__copy">${escapeHtml(dish.tips || "暂无补充备注。")}</p>
        </div>

        <div class="detail-view__actions">
          <button class="button button--ghost" type="button" id="detail-edit-dish">修改菜品</button>
          <button class="button button--primary" type="button" id="detail-add-to-order">加入今天想吃</button>
          <button class="button button--ghost" type="button" id="detail-close-action">关闭</button>
        </div>
      </div>
    </div>
  `;

  document.querySelector("#detail-edit-dish").addEventListener("click", () => {
    detailDialog.close();
    openEditorDialog("edit", dish.id);
  });

  document.querySelector("#detail-add-to-order").addEventListener("click", () => {
    updateCart(dish.id, 1);
    showToast(`已加入 ${dish.name}`);
  });

  document.querySelector("#detail-close-action").addEventListener("click", () => {
    detailDialog.close();
  });

  if (!detailDialog.open) {
    detailDialog.showModal();
  }
}

function buildCategoryOptions() {
  return categoryInputOptions
    .map((category) => `<option value="${escapeHtml(category)}">${escapeHtml(category)}</option>`)
    .join("");
}

function buildSelectOptions(options, currentValue) {
  return options
    .map((option) => {
      const selected = currentValue === option ? "selected" : "";
      return `<option value="${escapeHtml(option)}" ${selected}>${escapeHtml(option)}</option>`;
    })
    .join("");
}

function openEditorDialog(mode, dishId) {
  editorState.mode = mode;
  editorState.dishId = dishId || null;

  const currentDish =
    mode === "edit" && dishId
      ? deepClone(getDishById(dishId))
      : { ...dishDefaults(), accent: resolveAccent(dishDefaults()) };
  currentDish.category = getDisplayCategory(currentDish);
  const previewDish = normalizeDish(currentDish);
  const previewImage = getDishImageSource(previewDish);
  const initialImageValue = String(currentDish.image || "").trim();
  const imageTextValue = isInlineImageSource(initialImageValue) ? "" : initialImageValue;
  const title = mode === "edit" ? "修改菜品" : "新建菜品";
  const actionLabel = mode === "edit" ? "保存修改" : "创建菜品";

  editorDialogPanel.innerHTML = `
    <div class="dish-editor">
      <div class="dish-editor__hero" id="editor-preview-hero">
        <div class="dish-showcase__layer" id="editor-preview-media">
          ${renderDishShowcaseMedia(previewImage, previewDish.name || "菜品预览", previewDish.accent || resolveAccent(previewDish))}
        </div>
        <div class="dish-showcase__content">
          <p class="section-label">${mode === "edit" ? "Dish Editor" : "Create Dish"}</p>
          <h2 id="editor-preview-title">${escapeHtml(previewDish.name || "未命名菜品")}</h2>
          <p class="editor-copy" id="editor-preview-description">${escapeHtml(previewDish.description || "在右侧填写菜品信息后，这里会实时更新预览。")}</p>
          <div class="dish-editor__hero-meta" id="editor-preview-meta">
            <span>${escapeHtml(getDisplayCategory(previewDish))}</span>
            <span>${formatTime(previewDish.time)}</span>
            <span>${escapeHtml(previewDish.difficulty)}</span>
            <span>${renderSpiceIndicator(previewDish.spice)}</span>
            <span>${escapeHtml(renderStars(previewDish.rating))}</span>
          </div>
          <div class="editor-chip-preview" id="editor-preview-chips"></div>
        </div>
      </div>
      <div class="dish-editor__form-wrap">
        <form class="editor-form" id="dish-editor-form">
          <div class="dish-editor__toolbar">
            <div>
              <p class="section-label">Kitchen Studio</p>
              <h3>${title}</h3>
            </div>
            <div class="editor-actions">
              ${mode === "edit" ? '<button class="button button--danger" type="button" data-delete-dish>删除菜品</button>' : ""}
              <button class="button button--primary" type="submit">${actionLabel}</button>
            </div>
          </div>

          <div class="editor-grid">
            <label class="editor-field">
              菜名
              <input type="text" name="name" value="${escapeHtml(currentDish.name)}" placeholder="例如：奶油蘑菇意面" required />
            </label>
            <label class="editor-field">
              分类
              <select name="category">
                ${buildCategoryOptions().replace(`value="${escapeHtml(currentDish.category)}"`, `value="${escapeHtml(currentDish.category)}" selected`)}
              </select>
            </label>
            <label class="editor-field">
              难易程度
              <select name="difficulty">
                ${buildSelectOptions(["简单", "中等", "进阶"], currentDish.difficulty)}
              </select>
            </label>
            <label class="editor-field">
              推荐度
              <select name="rating">
                ${buildSelectOptions(["1", "2", "3", "4", "5"], String(currentDish.rating))}
              </select>
            </label>
            <label class="editor-field">
              预计时间（分钟）
              <input type="number" min="1" name="time" value="${escapeHtml(currentDish.time)}" />
            </label>
            <label class="editor-field">
              辣度
              <select name="spice">
                ${buildSelectOptions(["不辣", "微辣", "小辣", "中辣", "大辣", "爆辣"], currentDish.spice)}
              </select>
            </label>
            <label class="editor-field">
              份量
              <input type="text" name="servings" value="${escapeHtml(currentDish.servings)}" placeholder="例如：2 人份" />
            </label>
            <label class="editor-field">
              热量感受
              <input type="text" name="calories" value="${escapeHtml(currentDish.calories)}" placeholder="例如：轻盈 / 适中 / 丰富" />
            </label>
            <div class="editor-field editor-field--wide">
              <span class="editor-field__label">图片路径、链接或直接粘贴图片</span>
              <input type="hidden" name="image" id="editor-image-value" value="${escapeHtml(initialImageValue)}" />
              <input type="file" id="editor-image-file" accept="image/*" hidden />
              <input
                type="text"
                id="editor-image-text"
                value="${escapeHtml(imageTextValue)}"
                placeholder="推荐填 ./assets/dishes/xxx.jpg 这样的项目内相对路径"
              />
              <div class="editor-image-tools">
                <div class="editor-image-pastezone" id="editor-image-pastezone" tabindex="0" role="button" aria-label="直接粘贴菜品图片">
                  <strong>直接粘贴图片</strong>
                  <span>复制截图或图片后，可以按 Command/Ctrl + V；如果没反应，直接点下面的“导入剪贴板图片”。</span>
                </div>
                <div class="editor-image-actions">
                  <button class="button button--soft button--small" id="editor-read-clipboard-image" type="button">导入剪贴板图片</button>
                  <button class="button button--soft button--small" id="editor-pick-image" type="button">选择图片文件</button>
                  <button class="button button--ghost button--small" type="button" data-clear-image>清空图片</button>
                </div>
                <div class="editor-image-status" id="editor-image-status"></div>
              </div>
            </div>
            <label class="editor-field editor-field--wide">
              简述
              <textarea name="description" rows="3" placeholder="卡片只会精简展示这一段。">${escapeHtml(currentDish.description)}</textarea>
            </label>
          </div>

          <section class="editor-section">
            <div class="editor-section__head">
              <div>
                <h4>关键词与标签</h4>
                <p>用于主界面快速筛选</p>
              </div>
              <button class="button button--soft button--small" type="button" data-add-list="tags">添加标签</button>
            </div>
            <div class="list-editor" id="tags-list"></div>
          </section>

          <section class="editor-section">
            <div class="editor-section__head">
              <div>
                <h4>食材</h4>
                <p>会直接出现在详情里</p>
              </div>
              <button class="button button--soft button--small" type="button" data-add-list="ingredients">添加食材</button>
            </div>
            <div class="list-editor" id="ingredients-list"></div>
          </section>

          <section class="editor-section">
            <div class="editor-section__head">
              <div>
                <h4>做法步骤</h4>
                <p>你可以按需要增加任意步骤</p>
              </div>
              <button class="button button--soft button--small" type="button" data-add-list="steps">添加步骤</button>
            </div>
            <div class="steps-editor" id="steps-list"></div>
          </section>

          <section class="editor-section">
            <div class="editor-section__head">
              <div>
                <h4>烹饪备注</h4>
                <p>火候、替代食材、额外提醒都可以写这里</p>
              </div>
            </div>
            <label class="editor-field">
              备注
              <textarea name="tips" rows="4" placeholder="例如：最后再放黑胡椒，香气会更明显。">${escapeHtml(currentDish.tips)}</textarea>
            </label>
          </section>
        </form>
      </div>
    </div>
  `;

  renderEditorList("tags", currentDish.tags, "例如：下饭");
  renderEditorList("ingredients", currentDish.ingredients, "例如：番茄 2 个");
  renderEditorList("steps", currentDish.steps, "例如：先切好全部食材");
  updateEditorPreview();

  const editorForm = document.querySelector("#dish-editor-form");
  const imageFileInput = document.querySelector("#editor-image-file");
  const imagePasteZone = document.querySelector("#editor-image-pastezone");
  const readClipboardButton = document.querySelector("#editor-read-clipboard-image");
  const pickImageButton = document.querySelector("#editor-pick-image");
  editorForm.addEventListener("submit", submitDishEditor);
  editorForm.addEventListener("input", handleEditorFieldUpdate);
  editorForm.addEventListener("change", handleEditorFieldUpdate);
  editorForm.addEventListener("paste", handleEditorPaste);
  editorForm.addEventListener("click", handleEditorActions);
  imageFileInput?.addEventListener("change", handleEditorImageFileChange);
  imagePasteZone?.addEventListener("click", () => {
    imagePasteZone.focus();
    if (desktopBridge?.readClipboardImage) {
      importClipboardImageWithFeedback();
      return;
    }

    showToast("现在可以直接按 Command/Ctrl + V 粘贴图片。");
  });
  readClipboardButton?.addEventListener("click", (event) => {
    event.preventDefault();
    event.stopPropagation();
    showToast("正在读取剪贴板图片...");
    importClipboardImageWithFeedback();
  });
  pickImageButton?.addEventListener("click", (event) => {
    event.preventDefault();
    event.stopPropagation();
    if (imageFileInput instanceof HTMLInputElement) {
      imageFileInput.click();
    }
  });
  renderEditorImageStatus(initialImageValue);

  if (!editorDialog.open) {
    editorDialog.showModal();
  }
}

function renderEditorList(kind, values, placeholder) {
  const container = document.querySelector(`#${kind}-list`);
  const items = values.length ? values : [""];
  container.innerHTML = "";

  items.forEach((value, index) => {
    const item = document.createElement("div");
    item.className = "list-item";
    item.innerHTML = `
      <input
        type="text"
        data-list-input="${kind}"
        data-index="${index}"
        placeholder="${escapeHtml(kind === "steps" ? `步骤 ${index + 1}：${placeholder}` : placeholder)}"
        value="${escapeHtml(value)}"
      />
      <button class="list-item__remove" type="button" data-remove-list="${kind}" data-index="${index}">
        ×
      </button>
    `;
    container.appendChild(item);
  });
}

function getListValues(kind) {
  return Array.from(document.querySelectorAll(`[data-list-input="${kind}"]`))
    .map((input) => input.value.trim())
    .filter(Boolean);
}

function collectEditorRaw() {
  const form = document.querySelector("#dish-editor-form");
  const formData = new FormData(form);
  const imageInput = document.querySelector("#editor-image-value");
  const currentId =
    editorState.mode === "edit" && editorState.dishId
      ? editorState.dishId
      : `dish-${slugifyName(String(formData.get("name") || "")) || Date.now()}`;

  return {
    id: currentId,
    name: formData.get("name"),
    category: formData.get("category"),
    difficulty: formData.get("difficulty"),
    rating: formData.get("rating"),
    time: formData.get("time"),
    spice: formData.get("spice"),
    servings: formData.get("servings"),
    calories: formData.get("calories"),
    image: imageInput ? imageInput.value : formData.get("image"),
    description: formData.get("description"),
    tags: getListValues("tags"),
    ingredients: getListValues("ingredients"),
    steps: getListValues("steps"),
    tips: formData.get("tips")
  };
}

function collectEditorDish() {
  return normalizeDish(collectEditorRaw());
}

function updateEditorPreview() {
  const previewDish = collectEditorDish();
  const hero = document.querySelector("#editor-preview-hero");
  const media = document.querySelector("#editor-preview-media");
  const title = document.querySelector("#editor-preview-title");
  const description = document.querySelector("#editor-preview-description");
  const meta = document.querySelector("#editor-preview-meta");
  const chips = document.querySelector("#editor-preview-chips");
  const previewImage = getDishImageSource(previewDish);

  hero.style.backgroundImage = "";
  media.innerHTML = renderDishShowcaseMedia(
    previewImage,
    previewDish.name || "菜品预览",
    previewDish.accent || resolveAccent(previewDish)
  );
  title.textContent = previewDish.name || "未命名菜品";
  description.textContent = previewDish.description || "在右侧填写菜品信息后，这里会实时更新预览。";
  meta.innerHTML = `
    <span>${escapeHtml(getDisplayCategory(previewDish))}</span>
    <span>${formatTime(previewDish.time)}</span>
    <span>${escapeHtml(previewDish.difficulty)}</span>
    <span>${renderSpiceIndicator(previewDish.spice)}</span>
    <span>${escapeHtml(renderStars(previewDish.rating))}</span>
  `;

  chips.innerHTML = "";
  previewDish.tags.slice(0, 3).forEach((tag) => {
    const span = document.createElement("span");
    span.textContent = tag;
    chips.appendChild(span);
  });
  previewDish.ingredients.slice(0, 2).forEach((ingredient) => {
    const span = document.createElement("span");
    span.textContent = ingredient;
    chips.appendChild(span);
  });
}

function renderEditorImageStatus(source) {
  const status = document.querySelector("#editor-image-status");
  if (!status) {
    return;
  }

  const value = String(source || "").trim();
  if (!value) {
    status.textContent = "还没有设置图片，可直接粘贴截图，也可以继续填写路径或链接。";
    status.dataset.state = "empty";
    return;
  }

  if (isInlineImageSource(value)) {
    status.textContent = "当前使用的是剪贴板图片，保存后会直接跟着菜品一起存下来。";
    status.dataset.state = "pasted";
    return;
  }

  if (isLocalFileImageSource(value)) {
    status.textContent = "当前使用的是这台电脑的本地路径，打包发给别人时大概率无法显示，建议改成 ./assets/dishes/xxx.jpg。";
    status.dataset.state = "local-file";
    return;
  }

  if (isRelativeImageSource(value)) {
    status.textContent = "当前使用的是项目内相对路径；只要图片文件一起打包，对方电脑也能正常显示。";
    status.dataset.state = "relative-file";
    return;
  }

  status.textContent = "当前使用的是网络链接图片；如果对方电脑能联网，一般可以正常显示。";
  status.dataset.state = "linked";
}

function setEditorImageSource(source, options = {}) {
  const hiddenInput = document.querySelector("#editor-image-value");
  const textInput = document.querySelector("#editor-image-text");
  if (!hiddenInput || !textInput) {
    return;
  }

  const value = String(source || "").trim();
  hiddenInput.value = value;
  if (options.syncText !== false) {
    textInput.value = isInlineImageSource(value) ? "" : value;
  }

  renderEditorImageStatus(value);
  updateEditorPreview();
}

function handleEditorFieldUpdate(event) {
  if (event.target && event.target.id === "editor-image-text") {
    setEditorImageSource(event.target.value, { syncText: false });
    return;
  }

  updateEditorPreview();
}

function readFileAsDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ""));
    reader.onerror = () => reject(reader.error || new Error("read_failed"));
    reader.readAsDataURL(file);
  });
}

async function tryReadDesktopClipboardImage() {
  if (!desktopBridge?.readClipboardImage) {
    return false;
  }

  try {
    const dataUrl = await desktopBridge.readClipboardImage();
    if (!dataUrl) {
      return false;
    }

    setEditorImageSource(dataUrl);
    showToast("已从系统剪贴板读取图片，可直接保存。");
    return true;
  } catch (error) {
    console.error("Failed to read clipboard image from desktop app:", error);
    return false;
  }
}

async function importClipboardImageWithFeedback() {
  const loaded = await tryReadDesktopClipboardImage();
  if (loaded) {
    return;
  }

  showToast("剪贴板里没有可导入的图片，请先复制图片，或改用“选择图片文件”。");
}

async function handleEditorPaste(event) {
  if (!editorDialog.open) {
    return;
  }

  const items = Array.from(event.clipboardData?.items || []);
  const imageItem = items.find((item) => item.type.startsWith("image/"));
  if (!imageItem) {
    if (desktopBridge?.readClipboardImage) {
      event.preventDefault();
      const loaded = await tryReadDesktopClipboardImage();
      if (!loaded) {
        showToast("剪贴板里没有检测到图片。");
      }
    }
    return;
  }

  const file = imageItem.getAsFile();
  if (!file) {
    return;
  }

  event.preventDefault();

  try {
    const dataUrl = await readFileAsDataUrl(file);
    setEditorImageSource(dataUrl);
    showToast("已粘贴菜品图片，可直接保存。");
  } catch (error) {
    showToast("图片粘贴失败，请再试一次。");
  }
}

async function handleEditorImageFileChange(event) {
  const fileInput = event.target;
  if (!(fileInput instanceof HTMLInputElement) || fileInput.id !== "editor-image-file") {
    return;
  }

  const [file] = Array.from(fileInput.files || []);
  if (!file) {
    return;
  }

  try {
    const dataUrl = await readFileAsDataUrl(file);
    setEditorImageSource(dataUrl);
    showToast("已选取菜品图片，可直接保存。");
  } catch (error) {
    showToast("读取图片失败，请换一张再试。");
  } finally {
    fileInput.value = "";
  }
}

function handleEditorActions(event) {
  const deleteTarget = event.target.closest("[data-delete-dish]");
  if (deleteTarget) {
    deleteDishFromEditor();
    return;
  }

  const clearImageTarget = event.target.closest("[data-clear-image]");
  if (clearImageTarget) {
    setEditorImageSource("");
    showToast("菜品图片已清空。");
    return;
  }

  const addTarget = event.target.closest("[data-add-list]");
  if (addTarget) {
    const kind = addTarget.dataset.addList;
    const nextValues = [...getListValues(kind), ""];
    const placeholders = {
      tags: "例如：清爽",
      ingredients: "例如：牛肉 200g",
      steps: "例如：先切好全部食材"
    };
    renderEditorList(kind, nextValues, placeholders[kind]);
    updateEditorPreview();
    return;
  }

  const removeTarget = event.target.closest("[data-remove-list]");
  if (removeTarget) {
    const kind = removeTarget.dataset.removeList;
    const values = Array.from(document.querySelectorAll(`[data-list-input="${kind}"]`))
      .map((input, index) => ({
        value: input.value,
        keep: String(index) !== removeTarget.dataset.index
      }))
      .filter((item) => item.keep)
      .map((item) => item.value);

    const placeholders = {
      tags: "例如：清爽",
      ingredients: "例如：牛肉 200g",
      steps: "例如：先切好全部食材"
    };
    renderEditorList(kind, values, placeholders[kind]);
    updateEditorPreview();
  }
}

async function deleteDishFromEditor() {
  if (editorState.mode !== "edit" || !editorState.dishId) {
    return;
  }

  const dish = getDishById(editorState.dishId);
  if (!dish) {
    showToast("没有找到要删除的菜品。");
    return;
  }

  if (!window.confirm(`确认删除「${dish.name}」吗？删除后不会自动恢复。`)) {
    return;
  }

  const nextDishes = dishes.filter((item) => item.id !== editorState.dishId);

  try {
    await saveDishes(nextDishes);
  } catch (error) {
    console.error("Failed to delete dish:", error);
    showToast("删除菜品失败，请稍后再试。");
    return;
  }

  dishes = nextDishes;
  cart.delete(editorState.dishId);
  editorDialog.close();
  showToast(`已删除 ${dish.name}`);
  renderAll();
}

async function submitDishEditor(event) {
  event.preventDefault();

  const rawDish = collectEditorRaw();
  if (!String(rawDish.name || "").trim()) {
    showToast("请先填写菜名。");
    return;
  }

  const nextDish = normalizeDish(rawDish);
  const nextDishes =
    editorState.mode === "create"
      ? [nextDish, ...dishes]
      : dishes.map((dish) => (dish.id === editorState.dishId ? nextDish : dish));

  try {
    await saveDishes(nextDishes);
  } catch (error) {
    console.error("Failed to save dishes:", error);
    showToast("菜品保存失败，请稍后再试。");
    return;
  }

  dishes = nextDishes;
  if (editorState.mode === "create") {
    showToast(`已创建 ${nextDish.name}`);
  } else {
    if (cart.has(editorState.dishId) && editorState.dishId !== nextDish.id) {
      const quantity = cart.get(editorState.dishId);
      cart.delete(editorState.dishId);
      cart.set(nextDish.id, quantity);
    }
    showToast(`已更新 ${nextDish.name}`);
  }

  editorDialog.close();
  renderAll();
}

function renderAll() {
  renderCategoryFilters();
  renderActiveFilters();
  renderDishes();
  renderCart();
  renderOrders();
  updateOverviewStats();
}

async function initApp() {
  try {
    const [loadedDishes, loadedOrders] = await Promise.all([loadDishes(), loadOrders()]);
    dishes = loadedDishes;
    orders = loadedOrders;
  } catch (error) {
    console.error("Failed to initialize app:", error);
    dishes = initialDishes.map(normalizeDish);
    orders = [];
    showToast("读取本地数据失败，已回退到默认菜单。");
  }

  renderAll();
}

searchInput.addEventListener("input", (event) => {
  state.search = event.target.value;
  renderAll();
});

window.addEventListener("paste", handleEditorPaste);

orderForm.addEventListener("submit", submitOrder);
addDishButton.addEventListener("click", () => openEditorDialog("create"));
clearFiltersButton.addEventListener("click", clearFilters);
exportOrdersButton.addEventListener("click", exportOrders);
clearOrdersButton.addEventListener("click", clearOrders);

closeDetailDialogButton.addEventListener("click", () => detailDialog.close());
closeEditorDialogButton.addEventListener("click", () => editorDialog.close());

detailDialog.addEventListener("click", (event) => {
  if (event.target === detailDialog) {
    detailDialog.close();
  }
});

editorDialog.addEventListener("click", (event) => {
  if (event.target === editorDialog) {
    editorDialog.close();
  }
});

initApp();

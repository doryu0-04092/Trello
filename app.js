(() => {
  "use strict";

  const STORAGE_KEY = "trello-prototype-data";

  const LIST_TITLE_MAX = 50;
  const CARD_TEXT_MAX = 200;
  const TRASH_RETENTION_MS = 7 * 24 * 60 * 60 * 1000; // 1週間

  const PRIORITY_META = {
    high: { label: "高", order: 0 },
    medium: { label: "中", order: 1 },
    low: { label: "低", order: 2 },
  };

  /**
   * card: {id, text, dueDate, priority, comments}
   * list: {id, title, cards}
   * trash entry: {cardId, listId, index, card, deletedAt}
   */
  let data = loadData();

  let modalState = { listId: null, cardId: null };

  // ドラッグ中のペイロードをdataTransferに依存せず追跡する（dragover中はgetDataが読めないブラウザがあるため）
  let draggingPayload = null;

  const cardDropIndicator = document.createElement("li");
  cardDropIndicator.className = "drop-indicator";

  const listDropIndicator = document.createElement("li");
  listDropIndicator.className = "list-drop-indicator";

  // ===== データ永続化 =====
  function loadData() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) {
        // 初回起動時はデフォルトリストを作成する
        return {
          lists: [
            { id: genId("list"), title: "作業中", cards: [] },
            { id: genId("list"), title: "完了", cards: [] },
          ],
          trash: [],
        };
      }
      const parsed = JSON.parse(raw);
      if (!parsed || !Array.isArray(parsed.lists)) return { lists: [], trash: [] };
      if (!Array.isArray(parsed.trash)) parsed.trash = [];
      return parsed;
    } catch (e) {
      console.error("データの読み込みに失敗しました", e);
      return { lists: [], trash: [] };
    }
  }

  function saveData() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  }

  function genId(prefix) {
    return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  }

  // ===== バリデーション =====
  function validateListTitle(title) {
    const trimmed = title.trim();
    if (trimmed.length < 1) return { ok: false, message: "リスト名を入力してください" };
    if (trimmed.length > LIST_TITLE_MAX) return { ok: false, message: `リスト名は${LIST_TITLE_MAX}文字以内で入力してください` };
    return { ok: true, value: trimmed };
  }

  function validateCardText(text) {
    const trimmed = text.trim();
    if (trimmed.length < 1) return { ok: false, message: "タスク名を入力してください" };
    if (trimmed.length > CARD_TEXT_MAX) return { ok: false, message: `タスク名は${CARD_TEXT_MAX}文字以内で入力してください` };
    return { ok: true, value: trimmed };
  }

  function validateComment(text) {
    const trimmed = text.trim();
    if (trimmed.length < 1) return { ok: false, message: "コメントを入力してください" };
    return { ok: true, value: trimmed };
  }

  function showError(el, message) {
    el.textContent = message;
  }

  function clearError(el) {
    el.textContent = "";
  }

  function todayStr() {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  }

  // ===== レンダリング（ボード） =====
  function render() {
    const listsEl = document.getElementById("lists");
    listsEl.innerHTML = "";
    data.lists.forEach((list) => listsEl.appendChild(renderList(list)));
  }

  function renderList(list) {
    const li = document.createElement("li");
    li.className = "list";
    li.draggable = true;
    li.dataset.listId = list.id;

    // --- ヘッダー（タイトル＋削除） ---
    const header = document.createElement("div");
    header.className = "list-header";

    const title = document.createElement("div");
    title.className = "list-title";
    title.textContent = list.title;
    title.title = "クリックして名前を変更";
    title.addEventListener("click", () => startListRename(li, list, title));

    const deleteBtn = document.createElement("button");
    deleteBtn.className = "list-delete-btn";
    deleteBtn.textContent = "🗑";
    deleteBtn.title = "リストを削除";
    deleteBtn.addEventListener("click", () => deleteList(list));

    header.appendChild(title);
    header.appendChild(deleteBtn);
    li.appendChild(header);

    // --- 並び替えツールバー ---
    const toolbar = document.createElement("div");
    toolbar.className = "list-toolbar";

    const toolbarLabel = document.createElement("span");
    toolbarLabel.className = "list-toolbar-label";
    toolbarLabel.textContent = "並び替え:";
    toolbar.appendChild(toolbarLabel);

    const sortDueBtn = document.createElement("button");
    sortDueBtn.className = "list-sort-btn";
    sortDueBtn.textContent = "📅 期限日";
    sortDueBtn.title = "期限日が近い順に並べ替え";
    sortDueBtn.addEventListener("click", () => sortListByDueDate(list));
    toolbar.appendChild(sortDueBtn);

    const sortPriorityBtn = document.createElement("button");
    sortPriorityBtn.className = "list-sort-btn";
    sortPriorityBtn.textContent = "⚑ 優先度";
    sortPriorityBtn.title = "優先度が高い順に並べ替え";
    sortPriorityBtn.addEventListener("click", () => sortListByPriority(list));
    toolbar.appendChild(sortPriorityBtn);

    li.appendChild(toolbar);

    // --- カード一覧 ---
    const cardsEl = document.createElement("ul");
    cardsEl.className = "cards";
    cardsEl.dataset.listId = list.id;
    list.cards.forEach((card) => cardsEl.appendChild(renderCard(card, list)));
    li.appendChild(cardsEl);
    attachCardsDnD(cardsEl);

    // --- カード追加フォーム ---
    const form = document.createElement("form");
    form.className = "add-card-form";
    const input = document.createElement("input");
    input.type = "text";
    input.placeholder = "＋ カードを追加";
    input.maxLength = CARD_TEXT_MAX;
    const errorEl = document.createElement("div");
    errorEl.className = "field-error";
    form.appendChild(input);
    form.appendChild(errorEl);
    form.addEventListener("submit", (e) => {
      e.preventDefault();
      addCard(list, input, errorEl);
    });
    input.addEventListener("input", () => clearError(errorEl));
    li.appendChild(form);

    attachListDragHandlers(li, list);

    return li;
  }

  function renderCard(card, list) {
    const li = document.createElement("li");
    li.className = "card";
    li.draggable = true;
    li.dataset.cardId = card.id;

    const text = document.createElement("div");
    text.className = "card-text";
    text.textContent = card.text;
    li.appendChild(text);

    if (card.dueDate) {
      const due = document.createElement("span");
      due.className = "card-due";
      if (card.dueDate < todayStr()) due.classList.add("overdue");
      due.textContent = `📅 ${card.dueDate}`;
      li.appendChild(due);
    }

    if (card.priority && PRIORITY_META[card.priority]) {
      const priority = document.createElement("span");
      priority.className = `card-priority ${card.priority}`;
      priority.textContent = `優先度: ${PRIORITY_META[card.priority].label}`;
      li.appendChild(priority);
    }

    if (card.comments.length > 0) {
      const commentCount = document.createElement("span");
      commentCount.className = "card-comment-count";
      commentCount.textContent = `💬 ${card.comments.length}`;
      li.appendChild(commentCount);
    }

    const deleteBtn = document.createElement("button");
    deleteBtn.className = "card-delete-btn";
    deleteBtn.textContent = "×";
    deleteBtn.title = "カードを削除";
    deleteBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      deleteCard(list, card);
    });
    li.appendChild(deleteBtn);

    li.addEventListener("click", () => openModal(list.id, card.id));
    li.addEventListener("mouseenter", () => showCardCommentTooltip(card, li));
    li.addEventListener("mouseleave", hideCardCommentTooltip);

    attachCardDragHandlers(li, card, list);

    return li;
  }

  // ===== カードホバー時のコメントツールチップ =====
  function showCardCommentTooltip(card, cardEl) {
    if (!card.comments || card.comments.length === 0) return;

    const tooltip = document.getElementById("cardCommentTooltip");
    tooltip.innerHTML = "";

    const heading = document.createElement("div");
    heading.className = "card-comment-tooltip-title";
    heading.textContent = `コメント (${card.comments.length})`;
    tooltip.appendChild(heading);

    card.comments.forEach((comment) => {
      const item = document.createElement("div");
      item.className = "comment-item";
      const text = document.createElement("div");
      text.textContent = comment.text;
      const time = document.createElement("time");
      time.textContent = new Date(comment.createdAt).toLocaleString("ja-JP");
      item.appendChild(text);
      item.appendChild(time);
      tooltip.appendChild(item);
    });

    tooltip.classList.remove("hidden");

    const rect = cardEl.getBoundingClientRect();
    const tooltipRect = tooltip.getBoundingClientRect();
    let top = rect.bottom + 6;
    if (top + tooltipRect.height > window.innerHeight) top = rect.top - tooltipRect.height - 6;
    let left = rect.left;
    if (left + tooltipRect.width > window.innerWidth) left = window.innerWidth - tooltipRect.width - 8;

    tooltip.style.top = `${Math.max(top, 8)}px`;
    tooltip.style.left = `${Math.max(left, 8)}px`;
  }

  function hideCardCommentTooltip() {
    document.getElementById("cardCommentTooltip").classList.add("hidden");
  }

  // ===== リスト操作 =====
  function addList(input, errorEl) {
    const result = validateListTitle(input.value);
    if (!result.ok) {
      showError(errorEl, result.message);
      return;
    }
    data.lists.push({ id: genId("list"), title: result.value, cards: [] });
    saveData();
    render();
    input.value = "";
    clearError(errorEl);
    input.focus();
  }

  function deleteList(list) {
    const ok = window.confirm(`リスト「${list.title}」を削除しますか？\n含まれるカードもすべて削除されます。`);
    if (!ok) return;
    data.lists = data.lists.filter((l) => l.id !== list.id);
    saveData();
    render();
  }

  function startListRename(li, list, titleEl) {
    const input = document.createElement("input");
    input.type = "text";
    input.className = "list-title-input";
    input.maxLength = LIST_TITLE_MAX;
    input.value = list.title;
    titleEl.replaceWith(input);
    input.focus();
    input.select();

    let committed = false;
    const commit = () => {
      if (committed) return;
      committed = true;
      const result = validateListTitle(input.value);
      if (result.ok) {
        list.title = result.value;
        saveData();
      }
      render();
    };

    input.addEventListener("blur", commit);
    input.addEventListener("keydown", (e) => {
      if (e.key === "Enter") {
        e.preventDefault();
        input.blur();
      } else if (e.key === "Escape") {
        committed = true;
        render();
      }
    });
  }

  // ===== リストの自動並び替え =====
  function sortListByDueDate(list) {
    list.cards.sort((a, b) => {
      if (!a.dueDate && !b.dueDate) return 0;
      if (!a.dueDate) return 1;
      if (!b.dueDate) return -1;
      return a.dueDate < b.dueDate ? -1 : a.dueDate > b.dueDate ? 1 : 0;
    });
    saveData();
    render();
  }

  function sortListByPriority(list) {
    list.cards.sort((a, b) => {
      const aOrder = a.priority && PRIORITY_META[a.priority] ? PRIORITY_META[a.priority].order : 3;
      const bOrder = b.priority && PRIORITY_META[b.priority] ? PRIORITY_META[b.priority].order : 3;
      return aOrder - bOrder;
    });
    saveData();
    render();
  }

  // ===== カード操作 =====
  function addCard(list, input, errorEl) {
    const result = validateCardText(input.value);
    if (!result.ok) {
      showError(errorEl, result.message);
      return;
    }
    list.cards.push({ id: genId("card"), text: result.value, dueDate: null, priority: null, comments: [] });
    saveData();
    render();
  }

  function deleteCard(list, card) {
    const index = list.cards.findIndex((c) => c.id === card.id);
    if (index === -1) return;
    list.cards.splice(index, 1);
    data.trash.unshift({ cardId: card.id, listId: list.id, index, card, deletedAt: Date.now() });
    saveData();
    closeModal();
    render();
    renderTrash();
    updateTrashBadge();
  }

  function findListById(listId) {
    return data.lists.find((l) => l.id === listId);
  }

  function findCard(listId, cardId) {
    const list = findListById(listId);
    if (!list) return { list: null, card: null };
    return { list, card: list.cards.find((c) => c.id === cardId) || null };
  }

  // ===== ドラッグ＆ドロップ共通ヘルパー（挿入位置インジケーター） =====
  function getDnDPayload(e) {
    try {
      return JSON.parse(e.dataTransfer.getData("text/plain"));
    } catch (err) {
      return null;
    }
  }

  function removeCardIndicator() {
    if (cardDropIndicator.parentNode) cardDropIndicator.parentNode.removeChild(cardDropIndicator);
  }

  function insertCardIndicator(cardsEl, index) {
    const cards = Array.from(cardsEl.children).filter((el) => el.classList.contains("card"));
    const ref = cards[index] || null;
    if (ref) cardsEl.insertBefore(cardDropIndicator, ref);
    else cardsEl.appendChild(cardDropIndicator);
  }

  function removeListIndicator() {
    if (listDropIndicator.parentNode) listDropIndicator.parentNode.removeChild(listDropIndicator);
  }

  function insertListIndicator(listsEl, index) {
    const lists = Array.from(listsEl.children).filter((el) => el.classList.contains("list"));
    const ref = lists[index] || null;
    if (ref) listsEl.insertBefore(listDropIndicator, ref);
    else listsEl.appendChild(listDropIndicator);
  }

  function computeDropIndex(cardsEl, excludeCardId, clientY) {
    const siblings = Array.from(cardsEl.querySelectorAll(".card")).filter(
      (el) => el.dataset.cardId !== excludeCardId
    );
    for (let i = 0; i < siblings.length; i++) {
      const rect = siblings[i].getBoundingClientRect();
      if (clientY < rect.top + rect.height / 2) return i;
    }
    return siblings.length;
  }

  function computeListDropIndex(e, listsEl) {
    const siblings = Array.from(listsEl.children).filter((el) => el.classList.contains("list"));
    const targetLi = e.target.closest(".list");
    if (!targetLi) return siblings.length;
    const idx = siblings.indexOf(targetLi);
    const rect = targetLi.getBoundingClientRect();
    const before = e.clientX < rect.left + rect.width / 2;
    return before ? idx : idx + 1;
  }

  // ===== ドラッグ＆ドロップ（リスト並び替え） =====
  function attachListDragHandlers(li, list) {
    li.addEventListener("dragstart", (e) => {
      draggingPayload = { type: "list", id: list.id };
      e.dataTransfer.setData("text/plain", JSON.stringify(draggingPayload));
      e.dataTransfer.effectAllowed = "move";
      li.classList.add("dragging");
    });
  }

  function initListsDropZone() {
    const listsEl = document.getElementById("lists");
    listsEl.addEventListener("dragover", (e) => {
      e.preventDefault();
      if (!draggingPayload || draggingPayload.type !== "list") return;
      insertListIndicator(listsEl, computeListDropIndex(e, listsEl));
    });
    listsEl.addEventListener("dragleave", (e) => {
      if (!listsEl.contains(e.relatedTarget)) removeListIndicator();
    });
    listsEl.addEventListener("drop", (e) => {
      const payload = getDnDPayload(e);
      removeListIndicator();
      if (!payload || payload.type !== "list") return;
      e.preventDefault();

      const draggedIndex = data.lists.findIndex((l) => l.id === payload.id);
      if (draggedIndex === -1) return;

      let targetIndex = computeListDropIndex(e, listsEl);
      const [dragged] = data.lists.splice(draggedIndex, 1);
      if (draggedIndex < targetIndex) targetIndex -= 1;
      data.lists.splice(targetIndex, 0, dragged);

      saveData();
      render();
    });
  }

  // ===== ドラッグ＆ドロップ（カード移動・並び替え／ゴミ箱からの復元） =====
  function attachCardDragHandlers(li, card, list) {
    li.addEventListener("dragstart", (e) => {
      e.stopPropagation();
      hideCardCommentTooltip();
      draggingPayload = { type: "card", id: card.id, sourceListId: list.id };
      e.dataTransfer.setData("text/plain", JSON.stringify(draggingPayload));
      e.dataTransfer.effectAllowed = "move";
      li.classList.add("dragging");
    });
  }

  function attachCardsDnD(cardsEl) {
    cardsEl.addEventListener("dragover", (e) => {
      e.preventDefault();
      e.stopPropagation();
      if (!draggingPayload || (draggingPayload.type !== "card" && draggingPayload.type !== "trash-card")) return;
      const excludeId = draggingPayload.type === "card" ? draggingPayload.id : null;
      insertCardIndicator(cardsEl, computeDropIndex(cardsEl, excludeId, e.clientY));
    });
    cardsEl.addEventListener("dragleave", (e) => {
      if (!cardsEl.contains(e.relatedTarget)) removeCardIndicator();
    });
    cardsEl.addEventListener("drop", (e) => {
      const payload = getDnDPayload(e);
      removeCardIndicator();
      if (!payload) return;
      e.preventDefault();
      e.stopPropagation();
      if (payload.type === "card") {
        moveCard(payload, cardsEl, e.clientY);
      } else if (payload.type === "trash-card") {
        moveFromTrash(payload, cardsEl, e.clientY);
      }
    });
  }

  function moveCard(payload, targetCardsEl, clientY) {
    const sourceList = findListById(payload.sourceListId);
    const targetList = findListById(targetCardsEl.dataset.listId);
    if (!sourceList || !targetList) return;

    const cardIndex = sourceList.cards.findIndex((c) => c.id === payload.id);
    if (cardIndex === -1) return;

    const targetIndex = computeDropIndex(targetCardsEl, payload.id, clientY);

    const [card] = sourceList.cards.splice(cardIndex, 1);
    targetList.cards.splice(targetIndex, 0, card);

    saveData();
    render();
  }

  function moveFromTrash(payload, targetCardsEl, clientY) {
    const idx = data.trash.findIndex((t) => t.cardId === payload.cardId);
    if (idx === -1) return;
    const entry = data.trash[idx];

    const targetList = findListById(targetCardsEl.dataset.listId);
    if (!targetList) return;

    const targetIndex = computeDropIndex(targetCardsEl, null, clientY);

    data.trash.splice(idx, 1);
    targetList.cards.splice(targetIndex, 0, entry.card);

    saveData();
    render();
    renderTrash();
    updateTrashBadge();
  }

  // ===== カード編集モーダル =====
  function openModal(listId, cardId) {
    modalState = { listId, cardId };
    const { card } = findCard(listId, cardId);
    if (!card) return;

    document.getElementById("modalText").value = card.text;
    document.getElementById("modalDate").value = card.dueDate || "";
    document.getElementById("modalPriority").value = card.priority || "";
    clearError(document.getElementById("modalTextError"));
    clearError(document.getElementById("modalCommentError"));
    document.getElementById("addCommentInput").value = "";
    renderModalComments(card);

    document.getElementById("modalOverlay").classList.remove("hidden");
  }

  function closeModal() {
    document.getElementById("modalOverlay").classList.add("hidden");
    modalState = { listId: null, cardId: null };
  }

  function renderModalComments(card) {
    const ul = document.getElementById("modalCommentList");
    ul.innerHTML = "";
    card.comments.forEach((comment) => {
      const li = document.createElement("li");
      li.className = "comment-item";
      const text = document.createElement("div");
      text.textContent = comment.text;
      const time = document.createElement("time");
      time.textContent = new Date(comment.createdAt).toLocaleString("ja-JP");
      li.appendChild(text);
      li.appendChild(time);
      ul.appendChild(li);
    });
  }

  function initModalHandlers() {
    const overlay = document.getElementById("modalOverlay");
    const textEl = document.getElementById("modalText");
    const dateEl = document.getElementById("modalDate");
    const priorityEl = document.getElementById("modalPriority");
    const textErrorEl = document.getElementById("modalTextError");
    const commentErrorEl = document.getElementById("modalCommentError");

    overlay.addEventListener("click", (e) => {
      if (e.target === overlay) closeModal();
    });
    document.getElementById("modalClose").addEventListener("click", closeModal);
    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape" && !overlay.classList.contains("hidden")) closeModal();
    });

    textEl.addEventListener("input", () => clearError(textErrorEl));
    textEl.addEventListener("blur", () => {
      const { card } = findCard(modalState.listId, modalState.cardId);
      if (!card) return;
      const result = validateCardText(textEl.value);
      if (!result.ok) {
        showError(textErrorEl, result.message);
        textEl.value = card.text;
        return;
      }
      card.text = result.value;
      saveData();
      render();
    });

    dateEl.addEventListener("change", () => {
      const { card } = findCard(modalState.listId, modalState.cardId);
      if (!card) return;
      card.dueDate = dateEl.value || null;
      saveData();
      render();
    });

    priorityEl.addEventListener("change", () => {
      const { card } = findCard(modalState.listId, modalState.cardId);
      if (!card) return;
      card.priority = priorityEl.value || null;
      saveData();
      render();
    });

    document.getElementById("addCommentForm").addEventListener("submit", (e) => {
      e.preventDefault();
      const { card } = findCard(modalState.listId, modalState.cardId);
      if (!card) return;
      const input = document.getElementById("addCommentInput");
      const result = validateComment(input.value);
      if (!result.ok) {
        showError(commentErrorEl, result.message);
        return;
      }
      card.comments.push({ id: genId("comment"), text: result.value, createdAt: new Date().toISOString() });
      saveData();
      renderModalComments(card);
      input.value = "";
      clearError(commentErrorEl);
    });

    document.getElementById("addCommentInput").addEventListener("input", () => clearError(commentErrorEl));

    document.getElementById("modalDeleteCard").addEventListener("click", () => {
      const { list, card } = findCard(modalState.listId, modalState.cardId);
      if (!list || !card) return;
      deleteCard(list, card);
    });
  }

  // ===== ゴミ箱（削除済みカード） =====
  function purgeOldTrash() {
    const cutoff = Date.now() - TRASH_RETENTION_MS;
    const before = data.trash.length;
    data.trash = data.trash.filter((t) => t.deletedAt > cutoff);
    if (data.trash.length !== before) saveData();
  }

  function updateTrashBadge() {
    document.getElementById("trashCount").textContent = String(data.trash.length);
  }

  function renderTrash() {
    purgeOldTrash();
    const ul = document.getElementById("trashList");
    ul.innerHTML = "";

    if (data.trash.length === 0) {
      const empty = document.createElement("li");
      empty.className = "trash-empty";
      empty.textContent = "削除済みのカードはありません";
      ul.appendChild(empty);
      return;
    }

    data.trash.forEach((entry) => {
      const li = document.createElement("li");
      li.className = "trash-card-item";
      li.draggable = true;
      li.dataset.cardId = entry.cardId;

      const text = document.createElement("div");
      text.className = "trash-card-text";
      text.textContent = entry.card.text;
      li.appendChild(text);

      const metaParts = [];
      if (entry.card.dueDate) metaParts.push(`📅 ${entry.card.dueDate}`);
      if (entry.card.priority && PRIORITY_META[entry.card.priority]) {
        metaParts.push(`優先度: ${PRIORITY_META[entry.card.priority].label}`);
      }
      if (metaParts.length > 0) {
        const meta = document.createElement("div");
        meta.className = "trash-card-meta";
        meta.textContent = metaParts.join(" / ");
        li.appendChild(meta);
      }

      const deletedAt = document.createElement("div");
      deletedAt.className = "trash-card-deleted-at";
      deletedAt.textContent = `削除: ${new Date(entry.deletedAt).toLocaleString("ja-JP")}`;
      li.appendChild(deletedAt);

      const restoreBtn = document.createElement("button");
      restoreBtn.className = "trash-restore-btn";
      restoreBtn.textContent = "元の位置に戻す";
      restoreBtn.addEventListener("click", () => restoreToOriginalPosition(entry.cardId));
      li.appendChild(restoreBtn);

      li.addEventListener("dragstart", (e) => {
        draggingPayload = { type: "trash-card", cardId: entry.cardId };
        e.dataTransfer.setData("text/plain", JSON.stringify(draggingPayload));
        e.dataTransfer.effectAllowed = "move";
        li.classList.add("dragging");
      });

      ul.appendChild(li);
    });
  }

  function restoreToOriginalPosition(cardId) {
    const idx = data.trash.findIndex((t) => t.cardId === cardId);
    if (idx === -1) return;
    const entry = data.trash[idx];
    const list = findListById(entry.listId);
    if (!list) {
      window.alert("元のリストが削除されているため復元できません。ドラッグしてボードに戻してください。");
      return;
    }
    data.trash.splice(idx, 1);
    const insertIndex = Math.min(entry.index, list.cards.length);
    list.cards.splice(insertIndex, 0, entry.card);
    saveData();
    render();
    renderTrash();
    updateTrashBadge();
  }

  function initTrashHandlers() {
    const toggleBtn = document.getElementById("trashToggleBtn");
    const panel = document.getElementById("trashPanel");
    const closeBtn = document.getElementById("trashPanelClose");

    toggleBtn.addEventListener("click", () => {
      panel.classList.toggle("hidden");
      if (!panel.classList.contains("hidden")) renderTrash();
    });
    closeBtn.addEventListener("click", () => panel.classList.add("hidden"));

    setInterval(() => {
      const before = data.trash.length;
      purgeOldTrash();
      if (data.trash.length !== before) {
        renderTrash();
        updateTrashBadge();
      }
    }, 60 * 60 * 1000);
  }

  // ===== 初期化 =====
  function init() {
    purgeOldTrash();
    render();
    updateTrashBadge();
    initListsDropZone();
    initModalHandlers();
    initTrashHandlers();

    // ドロップ先が見つからない場合や操作キャンセル時も、ドラッグ状態とインジケーターを必ず後始末する
    document.addEventListener("dragend", (e) => {
      if (e.target && e.target.classList) e.target.classList.remove("dragging");
      draggingPayload = null;
      removeCardIndicator();
      removeListIndicator();
    });

    const addListForm = document.getElementById("addListForm");
    const addListInput = document.getElementById("addListInput");
    const addListError = document.getElementById("addListError");
    addListForm.addEventListener("submit", (e) => {
      e.preventDefault();
      addList(addListInput, addListError);
    });
    addListInput.addEventListener("input", () => clearError(addListError));
  }

  document.addEventListener("DOMContentLoaded", init);
})();

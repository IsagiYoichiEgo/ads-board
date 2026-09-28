(function (root, factory) {
  const api = factory();
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  root.AdsBoard = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  const API_URL = 'https://inai-col1.fishrungames.com/ads';
  const API_ORIGIN = 'https://inai-col1.fishrungames.com';

  function validateAdInput(input) {
    const title = String(input.title || '').trim();
    const description = String(input.description || '').trim();
    const priceNumber = Number(input.price);

    if (!title || !description || !Number.isFinite(priceNumber) || priceNumber <= 0) {
      return { valid: false, message: 'Заполните название, описание и положительную цену.' };
    }

    return { valid: true, values: { title, description, price: String(priceNumber) } };
  }

  function validateAdsResponse(payload) {
    if (!payload || !Array.isArray(payload.items)) {
      throw new Error('Сервер вернул некорректный список объявлений.');
    }
    return payload.items;
  }

  function resolveImageUrl(imageUrl) {
    if (!imageUrl) return null;
    return new URL(imageUrl, API_ORIGIN).href;
  }

  async function createAdRequest(input, fetchImpl) {
    const formData = new FormData();
    formData.append('title', input.title);
    formData.append('description', input.description);
    formData.append('price', input.price);
    if (input.image) formData.append('image', input.image);

    const response = await fetchImpl(API_URL, { method: 'POST', body: formData });
    if (!response.ok) throw new Error('Не удалось опубликовать объявление.');
    return undefined;
  }

  function initPage() {
    const form = document.querySelector('#ad-form');
    const list = document.querySelector('#ads-list');
    const listStatus = document.querySelector('#list-status');
    const formStatus = document.querySelector('#form-status');
    const retryButton = document.querySelector('#retry-button');
    const submitButton = document.querySelector('#submit-button');

    function setStatus(element, type, message) {
      element.hidden = !message;
      element.className = `status ${type || ''}`;
      element.textContent = message || '';
    }

    function createCard(ad) {
      const article = document.createElement('article');
      article.className = 'ad-card';
      const title = document.createElement('h3');
      const description = document.createElement('p');
      const price = document.createElement('p');
      title.textContent = ad.title || 'Без названия';
      description.textContent = ad.description || 'Описание отсутствует';
      price.className = 'price';
      price.textContent = `${Number(ad.price).toLocaleString('ru-RU')} ₸`;
      article.append(title, description, price);

      const imageUrl = resolveImageUrl(ad.image_url);
      if (imageUrl) {
        const image = document.createElement('img');
        image.src = imageUrl;
        image.alt = ad.title ? `Фото: ${ad.title}` : 'Фото объявления';
        image.loading = 'lazy';
        article.prepend(image);
      }
      return article;
    }

    async function loadAds() {
      setStatus(listStatus, 'loading', 'Загружаем объявления…');
      retryButton.hidden = true;
      try {
        const response = await fetch(API_URL);
        if (!response.ok) throw new Error('GET failed');
        const ads = validateAdsResponse(await response.json());
        list.replaceChildren(...ads.map(createCard));
        setStatus(listStatus, '', ads.length ? '' : 'Объявлений пока нет.');
        return true;
      } catch (error) {
        setStatus(listStatus, 'error', 'Не удалось загрузить объявления.');
        retryButton.hidden = false;
        return false;
      }
    }

    form.addEventListener('submit', async (event) => {
      event.preventDefault();
      const validation = validateAdInput({
        title: form.elements.title.value,
        description: form.elements.description.value,
        price: form.elements.price.value
      });
      if (!validation.valid) {
        setStatus(formStatus, 'error', validation.message);
        return;
      }

      submitButton.disabled = true;
      setStatus(formStatus, 'loading', 'Публикуем объявление…');
      try {
        await createAdRequest({ ...validation.values, image: form.elements.image.files[0] }, fetch);
        form.reset();
        const listWasUpdated = await loadAds();
        setStatus(formStatus, 'success', listWasUpdated ? 'Объявление опубликовано. Список обновлён.' : 'Объявление опубликовано. Не удалось обновить список.');
      } catch (error) {
        setStatus(formStatus, 'error', 'Не удалось опубликовать объявление. Проверьте данные и повторите попытку.');
      } finally {
        submitButton.disabled = false;
      }
    });

    retryButton.addEventListener('click', loadAds);
    loadAds();
  }

  if (typeof document !== 'undefined') {
    initPage();
  }

  return { API_URL, validateAdInput, validateAdsResponse, resolveImageUrl, createAdRequest };
});

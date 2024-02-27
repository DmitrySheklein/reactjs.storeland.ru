(() => {
  const { useState, useEffect, useRef } = window.React;
  const {
    useQuery,
    useMutation,
    useQueryClient,
    QueryClient,
    QueryClientProvider,
  } = window.ReactQuery;
  const { IMaskInput } = window.ReactIMask;
  const { ReactQueryDevtools } = window.ReactQueryDevtools;
  const classNames = window.classNames;
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        refetchOnWindowFocus: false, // default: true
      },
    },
  });
  const QUERY_KEYS = {
    Cart: 'Cart',
    FormState: 'FormState',
    QuickFormData: 'QuickFormData',
  };
  const container = document.getElementById('root-cart');
  const { createRoot } = window.ReactDOM;
  const root = createRoot(container);

  root.render(
    <QueryClientProvider client={queryClient}>
      <App />
      <ReactQueryDevtools initialIsOpen={false} />
    </QueryClientProvider>
  );

  function App() {
    return (
      <>
        <EmptyCart />
        <Cart />
        <OrderForm />
      </>
    );
  }

  function useFormState(options) {
    const INITIAL_FORM_DATA = {
      form: {
        contact: {
          person: '',
          phone: '',
          email: '',
        },
        delivery: {
          id: undefined,
          zone_id: undefined,
        },
        payment: {
          id: undefined,
        },
        coupon_code: '',
        isCouponSend: false,
      },
    };
    const key = QUERY_KEYS.FormState;
    const query = useQuery({
      queryKey: [key],
      initialData: INITIAL_FORM_DATA,
      queryFn: () => initialData,
      enabled: false,
      ...options,
    });

    return [query.data, (value) => queryClient.setQueryData([key], value)];
  }

  function useQuickFormData(option) {
    const [_, setFormState] = useFormState();

    return useQuery({
      queryKey: [QUERY_KEYS.QuickFormData],
      initialData: { SETTINGS_ORDER_FIELDS: {} },
      queryFn: async () => {
        const { data: dataString } = await axios.get(`/cart/add`, {
          responseType: 'text',
          params: {
            ajax_q: 1,
            fast_order: 1,
          },
        });

        return JSON.parse(dataString).data;
      },
      onSuccess: (data) => {
        const {
          ORDER_FORM_CONTACT_PERSON,
          ORDER_FORM_CONTACT_PHONE,
          ORDER_FORM_CONTACT_EMAIL,
        } = data;

        const [firstDelivery] = data?.deliveries;

        setFormState((prev) => ({
          ...prev,
          form: {
            ...prev.form,
            contact: {
              person: ORDER_FORM_CONTACT_PERSON,
              //  || 'User'
              phone: ORDER_FORM_CONTACT_PHONE,
              // || '89876543210'
              email: ORDER_FORM_CONTACT_EMAIL,
              //  || 'user@test.ru'
            },
            delivery: {
              id: firstDelivery?.id,
              zone_id: firstDelivery?.zoneList[0]?.zoneId,
            },
            payment: {
              id: firstDelivery?.availablePaymentList[0]?.id,
            },
          },
        }));
      },
      ...option,
    });
  }

  function useCart(option, formElement) {
    return useQuery({
      queryKey: [QUERY_KEYS.Cart],
      queryFn: async () => {
        if (!formElement) return;
        const formData = new FormData(formElement);
        // formData.append('ajax_q', 1);
        // formData.append('only_body', 1);

        for (const pair of formData.entries()) {
          // console.log(pair[0] + ', ' + pair[1]);
        }
        const { data } = await axios.post(`/cart`, formData, {
          // const { data } = await axios.post(`/order/stage/confirm`, formData, {
          responseType: 'text',
          params: {
            only_body: 1,
            hash: window.HASH,
          },
        });

        const cardData = JSON.parse(data);

        return cardData;
      },
      enabled: Boolean(formElement),
      ...option,
    });
  }

  function useClearCartMutation(options) {
    return useMutation({
      mutationFn: async () => {
        const response = await axios.get(`/cart/truncate/`);
        const isOk = response.status === 200;
        if (isOk) {
          queryClient.setQueryData([QUERY_KEYS.Cart], null);
        }
        return isOk;
      },
      ...options,
    });
  }
  function useClearCartItemMutation(options) {
    return useMutation({
      mutationFn: async (itemId) => {
        const response = await axios.get(`/cart/delete/${itemId}`);

        return response.status;
      },
      ...options,
    });
  }
  function useClearCartItemsMutation(options) {
    return useMutation({
      mutationFn: async (itemsIdArray) => {
        const formData = new FormData();
        formData.append('ajax_q', 1);
        itemsIdArray.forEach((id) => formData.append('id[]', id));

        const response = await axios.post(`/cart/delete/`, formData);

        return response.status;
      },
      ...options,
    });
  }

  function useCreateOrderMutation() {
    return useMutation({
      mutationFn: async (form) => {
        const formData = new FormData(form);

        for (const pair of formData.entries()) {
          // console.log(pair[0] + ', ' + pair[1]);formData
        }
        const response = await axios.post(`/order/stage/confirm`, formData, {
          params: {
            ajax_q: 1,
            hash: window.HASH,
          },
        });

        return response;
      },
      onSuccess: ({ data }) => {
        const { status, location: redirectLink, message } = data;

        if (status === 'error') {
          console.error(message);
        }
        if (redirectLink) {
          location.href = redirectLink;
        }
      },
    });
  }
  function useAddCartMutation(options) {
    return useMutation({
      mutationFn: async (form) => {
        const formData = new FormData(form);

        for (const pair of formData.entries()) {
          // console.log(pair[0] + ', ' + pair[1]);formData
        }
        const response = await axios.post(`/cart/add/`, formData, {
          params: {
            ajax_q: 1,
            hash: window.HASH,
          },
        });
        // console.log(response);
        return response;
      },
      ...options,
    });
  }

  function Cart() {
    const formRef = useRef(null);
    const formElement = formRef?.current;
    const [formState, setFormState] = useFormState();
    const { data: quickFormData } = useQuickFormData({
      enabled: !Boolean(window.CART_IS_EMPTY),
    });

    const {
      form: {
        delivery: { id: currentDeliveryId, zone_id: zoneId },
        payment: { id: currentPaymentId },
        coupon_code: couponCode,
        isCouponSend,
      },
    } = formState;

    const {
      data: cartData,
      refetch: refetchCart,
      isSuccess: isSuccessCart,
      isLoading: isLoadingCart,
      isFetching: isFetchingCart,
    } = useCart(
      {
        onSuccess: () => {
          setFormState({
            ...formState,
            form: {
              ...formState.form,
              isCouponSend: false,
            },
          });
        },
      },
      formElement
    );

    const {
      CART_SUM_DISCOUNT,
      CART_SUM_DISCOUNT_PERCENT,
      CART_COUNT_TOTAL,
      CART_SUM_NOW_WITH_DELIVERY_AND_DISCOUNT,
      cartItems,
      CART_SUM_NOW,
      CART_SUM_DELIVERY,
      CART_SUM_OLD_WITH_DELIVERY,
      CART_SUM_SUPPLIER_WITH_DELIVERY,
      CART_SUM_NOW_WITH_DELIVERY,
      SETTINGS_STORE_ORDER_MIN_ORDER_PRICE,
      SETTINGS_STORE_ORDER_MIN_PRICE_WITHOUT_DELIVERY,
      cartDiscount,
    } = cartData || {};
    const isCartItemsLength = cartItems?.length;

    useEffect(() => {
      // console.log(
      //   isCouponSend,
      //   currentDeliveryId,
      //   zoneId,
      //   isCartRelatedGoodsLength
      // );
      if (isCouponSend || currentDeliveryId || zoneId) {
        refetchCart();
      }
    }, [isCouponSend, currentDeliveryId, zoneId]);
    const clearCartMutation = useClearCartMutation();

    const handleSubmit = (event) => {
      event?.preventDefault();

      window.Utils.debounce(() => {
        refetchCart();
      }, 300)();
    };
    const getCurrentMinOrderPrice = () => {
      let result;

      if (SETTINGS_STORE_ORDER_MIN_PRICE_WITHOUT_DELIVERY) {
        result = SETTINGS_STORE_ORDER_MIN_ORDER_PRICE - CART_SUM_NOW;
      } else {
        result =
          SETTINGS_STORE_ORDER_MIN_ORDER_PRICE - CART_SUM_NOW_WITH_DELIVERY;
      }

      return Math.max(result, 0);
    };
    const [deletedItemsArray, setDeletedItemsArray] = useState([]);
    const clearCartItemsMutation = useClearCartItemsMutation({
      onSuccess: () => {
        refetchCart();
        setDeletedItemsArray([]);
      },
    });
    const changeDeletedItemHandler = (goodsId) => {
      setDeletedItemsArray((prev) => {
        const isInDeletedArray = prev.includes(goodsId);

        if (isInDeletedArray) {
          return prev.filter((id) => id !== goodsId);
        } else {
          return [...prev, goodsId];
        }
      });
    };
    const [cartDiscountObj] = cartDiscount || [];
    if (window.CART_IS_EMPTY) {
      return null;
    }

    return (
      <>
        <div className="cart" style={{ position: 'relative' }}>
          {(isFetchingCart || clearCartMutation.isLoading) && <Preloader />}

          {isCartItemsLength ? (
            <div
              style={{
                display: 'flex',
                flexWrap: 'wrap',
                alignItems: 'center',
                gap: 10,
              }}
            >
              <h1 style={{ width: '100%' }}>Корзина</h1>

              {deletedItemsArray.length &&
              !(deletedItemsArray.length === cartItems.length) ? (
                <button
                  className="button"
                  onClick={() => {
                    clearCartItemsMutation.mutate(deletedItemsArray);
                  }}
                >
                  {clearCartMutation.isLoading
                    ? '(Очищается..)'
                    : `Удалить выбранные (${deletedItemsArray.length})`}
                </button>
              ) : (
                <button
                  className="button"
                  onClick={() => {
                    clearCartMutation.mutate();
                  }}
                >
                  {clearCartMutation.isLoading
                    ? '(Очищается..)'
                    : 'Очистить корзину'}
                </button>
              )}

              <label style={{ display: 'flex', gap: 10 }}>
                <input
                  type="checkbox"
                  onChange={(evt) => {
                    const { checked } = evt.target;

                    setDeletedItemsArray(
                      checked ? cartItems.map((el) => el.GOODS_MOD_ID) : []
                    );
                  }}
                  checked={cartItems.length === deletedItemsArray.length}
                />
                Выбрать всё
              </label>
            </div>
          ) : null}

          <form onSubmit={handleSubmit} ref={formRef} id="card">
            <input
              name="form[delivery][id]"
              defaultValue={currentDeliveryId}
              hidden
            />
            {zoneId && (
              <input
                name="form[delivery][zone_id]"
                defaultValue={zoneId}
                hidden
              />
            )}
            <input
              name="form[payment][id]"
              defaultValue={currentPaymentId}
              hidden
            />
            {isCouponSend && couponCode && (
              <input
                name="form[coupon_code]"
                defaultValue={couponCode}
                hidden
              />
            )}

            {isCartItemsLength ? (
              <ul style={{ listStyle: 'none' }}>
                {cartItems.map((item) => (
                  <CartItem
                    item={item}
                    key={item.GOODS_MOD_ID}
                    handleSubmit={handleSubmit}
                    refetchCart={refetchCart}
                    checked={deletedItemsArray.includes(item.GOODS_MOD_ID)}
                    changeDeletedItemHandler={changeDeletedItemHandler}
                  />
                ))}
              </ul>
            ) : null}
          </form>
          {isCartItemsLength ? (
            <ul>
              <li>Товаров: {CART_COUNT_TOTAL} шт.</li>
              <li>Сумма товаров: {CART_SUM_NOW}</li>
              <li>
                Доставка (id: {currentDeliveryId}):{' '}
                <b>{zoneId ? CART_SUM_OLD_WITH_DELIVERY : CART_SUM_DELIVERY}</b>
                //BUG: бек неверно отдаёт цену доставки при выбранной зоне
                доставки
              </li>
              {zoneId && (
                <li>
                  Зона доставки (zoneId: {zoneId}): <b></b>
                </li>
              )}
              <li>Метод оплаты (id): {currentPaymentId}</li>
              {quickFormData.ORDER_DISCOUNT_COUPON_IS_ENABLED && (
                <li>Купон : {couponCode}</li>
              )}
              {cartDiscountObj && (
                <>
                  Скидка
                  <ul>
                    <li>
                      {cartDiscountObj.DISCOUNT_VALUE}{' '}
                      {cartDiscountObj.IS_PERCENT ? '%' : 'р.'}
                    </li>
                    <li>{cartDiscountObj.DISCOUNT_NAME}</li>
                    <li>{cartDiscountObj.DISCOUNT_TYPE_DESCRIPTION}</li>
                  </ul>
                </>
              )}
              {/* <li> Скидка: {CART_SUM_DISCOUNT} </li> */}
              {/* <li>Скидка процент: {CART_SUM_DISCOUNT_PERCENT}</li> */}
              <li>Итого с доставкой: {CART_SUM_NOW_WITH_DELIVERY}</li>
              {SETTINGS_STORE_ORDER_MIN_ORDER_PRICE ? (
                <li>
                  Минимальная сумма заказа (
                  {SETTINGS_STORE_ORDER_MIN_PRICE_WITHOUT_DELIVERY
                    ? 'Без учёта стоимости доставки'
                    : 'с доставкой'}
                  ): {SETTINGS_STORE_ORDER_MIN_ORDER_PRICE}, Осталось:{' '}
                  {getCurrentMinOrderPrice()}
                </li>
              ) : null}
              {/* <li>Итого old с доставкой: {CART_SUM_OLD_WITH_DELIVERY}</li> */}
              <li>
                Итого с доставкой и скидкой:{' '}
                <b>{CART_SUM_NOW_WITH_DELIVERY_AND_DISCOUNT}</b>
              </li>
            </ul>
          ) : null}
        </div>

        {isCartItemsLength ? (
          <RelatedGoods cartData={cartData} refetchCart={refetchCart} />
        ) : null}
        <br />
        {isCartItemsLength ? (
          <RecentlyViewed cartData={cartData} refetchCart={refetchCart} />
        ) : null}
        <br />
      </>
    );
  }

  function CartItem({
    item,
    handleSubmit,
    refetchCart,
    checked,
    changeDeletedItemHandler,
  }) {
    const {
      GOODS_ID,
      GOODS_MOD_ID,
      GOODS_NAME,
      ORDER_LINE_PRICE_NOW,
      ORDER_LINE_QUANTITY = 1,
      GOODS_IMAGE,
      GOODS_URL,
      GOODS_MOD_ART_NUMBER,
      distinctiveProperties,
    } = item;
    const deleteCartItemMutation = useClearCartItemMutation({
      onSuccess: () => {
        refetchCart();
      },
    });
    const [inputValue, setInputValue] = useState(ORDER_LINE_QUANTITY);
    const handleBlur = (event) => {
      const { value, min } = event.target;
      const numericValue = Math.max(Number(parseInt(value, 10)), Number(min));

      setInputValue(numericValue);

      if (ORDER_LINE_QUANTITY != inputValue) {
        handleSubmit();
      }
    };

    const handleChange = (event) => {
      const { value } = event.target;
      const numericValue = Number(value);

      if (!isNaN(numericValue)) {
        setInputValue(value === '' ? '' : numericValue);
      }
    };
    const handleRemoveItem = () => {
      deleteCartItemMutation.mutate(GOODS_MOD_ID);
    };
    const handlePaste = () => {};

    if (deleteCartItemMutation.isSuccess) {
      return null;
    }

    return (
      <li
        style={{ position: 'relative' }}
        data-product-id={GOODS_ID}
        data-mod-id={GOODS_MOD_ID}
      >
        {deleteCartItemMutation.isLoading && <Preloader />}
        <div style={{ display: 'flex', gap: 20 }}>
          <div>
            <input
              type="checkbox"
              title="Удалить выбранный"
              checked={checked}
              onChange={() => {
                changeDeletedItemHandler(GOODS_MOD_ID);
              }}
            />
          </div>
          <div>
            <div style={{ display: 'flex', gap: 20 }}>
              <h3>{GOODS_NAME}</h3>
              <button
                // hidden
                onClick={handleRemoveItem}
                type="button"
                title="Удалить из корзины"
              >
                <span className="cart__delete-icon">
                  <svg className="icon _close">
                    <use xlinkHref="/design/sprite.svg#close"></use>
                  </svg>
                </span>
              </button>
            </div>
            <div>
              <strong>Артикул:{GOODS_MOD_ART_NUMBER}</strong>
            </div>
            {distinctiveProperties?.length ? (
              <>
                {distinctiveProperties.map(({ NAME, VALUE }, idx) => (
                  <div key={idx}>
                    <strong>
                      {NAME}: {VALUE}
                    </strong>
                  </div>
                ))}
              </>
            ) : null}
            <div>
              <strong>Кол-во:{ORDER_LINE_QUANTITY}</strong>
            </div>
            <div>
              <strong>Цена:{ORDER_LINE_PRICE_NOW / ORDER_LINE_QUANTITY}</strong>{' '}
              //BUG: бек отдаёт неверную цену товара при скидке по сумме заказа
            </div>
          </div>
          <div>
            <a href={GOODS_URL}>
              <img width="80" src={GOODS_IMAGE} />
            </a>
            <div className="qty">
              <div className="qty__wrap">
                <button
                  type="submit"
                  className="qty__btn"
                  onClick={() => {
                    setInputValue(inputValue - 1 || 1);
                  }}
                  disabled={inputValue <= 1}
                >
                  <svg className="icon">
                    <use xlinkHref="/design/sprite.svg#minus-icon"></use>
                  </svg>
                </button>
                <input
                  name={`form[quantity][${GOODS_MOD_ID}]`}
                  min="1"
                  pattern="[0-9]*"
                  inputMode="numeric"
                  type="number"
                  value={inputValue}
                  onChange={handleChange}
                  onBlur={handleBlur}
                  onPaste={handlePaste}
                  className="input qty__input"
                />
                <button
                  type="submit"
                  className="qty__btn"
                  onClick={() => {
                    setInputValue(inputValue + 1);
                  }}
                >
                  <svg className="icon">
                    <use xlinkHref="/design/sprite.svg#plus-icon"></use>
                  </svg>
                </button>
              </div>
            </div>
          </div>
        </div>
      </li>
    );
  }

  function useFormValidation() {
    const [formErrors, setFormErrors] = useState({
      person: '',
      phone: '',
      email: '',
      password: '',

      country: '',
      zipCode: '',

      comment: '',
    });
    const validateElement = (element) => {
      const { id, value, required, minLength } = element;

      // console.log(id, required, !value.length);

      if (id === 'person' && value.length < 3) {
        setFormErrors((prevState) => ({
          ...prevState,
          [id]: 'Name must be at least 3 characters long.',
        }));

        return false;
      } else if (id === 'email' && !isValidEmail(value)) {
        setFormErrors((prevState) => ({
          ...prevState,
          [id]: 'Please enter a valid email address.',
        }));

        return false;
      } else if (id === 'password' && value.length < minLength) {
        setFormErrors((prevState) => ({
          ...prevState,
          [id]: `Password must be at least ${minLength} characters long.`,
        }));

        return false;
      } else if (id === 'phone' && !isValidPhone(value)) {
        setFormErrors((prevState) => ({
          ...prevState,
          [id]: 'Пожалуйста, введите корректный телефон.',
        }));

        return false;
      } else if (id === 'zipCode' && required && value.length < minLength) {
        setFormErrors((prevState) => ({
          ...prevState,
          [id]: 'Please enter zipCode.',
        }));

        return false;
      } else if (required && !value) {
        setFormErrors((prevState) => ({
          ...prevState,
          [id]: 'Это поле необходимо заполнить.',
        }));

        return false;
      } else {
        setFormErrors((prevState) => ({
          ...prevState,
          [id]: '', // Reset error message
        }));

        return true;
      }

      function isValidEmail(email) {
        // Регулярное выражение для проверки валидности email
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

        // Проверка совпадения с регулярным выражением
        return emailRegex.test(email);
      }

      function isValidPhone(phone) {
        // Регулярное выражение для проверки валидности телефонного номера
        var phoneRegex = /^\+\d{1,3}\s\d{1,3}\s\d{2,3}-\d{2}-\d{2}$/;

        // Проверка совпадения с регулярным выражением
        return phoneRegex.test(phone);
      }
    };

    const checkFormValid = (form) => {
      const formElements = Array.from(form.elements).filter(
        (el) => el.required
      );

      const isValid = formElements.map(validateElement).every(Boolean);

      return isValid;
    };

    return {
      formErrors,
      setFormErrors,
      validateElement,
      checkFormValid,
    };
  }
  function OrderForm() {
    const { data: cartData } = useCart();
    const [formState, setFormState] = useFormState();
    const { data: quickFormData, isLoading: isLoadingDelivery } =
      useQuickFormData({
        enabled: !Boolean(window.CART_IS_EMPTY),
      });
    const { deliveries, CLIENT_IS_LOGIN, ORDER_DISCOUNT_COUPON_IS_ENABLED } =
      quickFormData;
    const createOrderMutation = useCreateOrderMutation();
    const { isLoading: isOrderLoading } = createOrderMutation;
    const {
      form: {
        delivery: { id: deliveryId, zone_id: zoneId },
        payment: { id: paymentId },
        coupon_code: couponCode,
      },
    } = formState;
    const zoneList = deliveries?.find(({ id }) => id === deliveryId)?.zoneList;
    const [localForm, setLocalFormState] = useState({
      wantRegister: false,
      showPassword: false,
      extraDontCall: false,
    });
    const { wantRegister, extraDontCall, showPassword } = localForm;
    const { formErrors, validateElement, checkFormValid } = useFormValidation();
    const handleSubmit = (event) => {
      event.preventDefault();

      const formElement = event.target;
      const isFormValid = checkFormValid(formElement);
      console.log(isFormValid, formErrors);

      if (!isFormValid) {
        return;
      }

      createOrderMutation.mutate(formElement);
    };

    const handleChange = (event) => {
      const { name, value, id } = event.target;
      // Разбиваем строку "form[contact][person]" на массив ключей ["form", "contact", "person"]
      const keys = name.split(/\[|\]/).filter(Boolean);

      const fieldData = keys.reduceRight((acc, key, index) => {
        const isLast = index === keys.length - 1;

        return { [key]: isLast ? value : acc };
      }, {});

      if (id === 'delivery-select') {
        const zL = deliveries?.find(({ id }) => id === value)?.zoneList;

        fieldData.form.delivery.zone_id = zL[0]?.zoneId;
        console.log(keys, zL, fieldData);
      }
      // console.log(fieldData);
      const newData = Utils.mergeWith(
        { ...formState },
        fieldData,
        Utils.customizer
      );

      setFormState(newData);
      validateElement(event.target);
    };
    const handleCouponBtn = () => {
      setFormState({
        ...formState,
        form: {
          ...formState.form,
          isCouponSend: true,
        },
      });
      console.log('reset');
    };

    if (window.CART_IS_EMPTY || !cartData?.CART_COUNT_TOTAL) {
      return null;
    }

    if (isLoadingDelivery) {
      return <div>Загружаю варианты доставки...</div>;
    }

    return (
      <>
        <form
          onSubmit={handleSubmit}
          id="orderForm"
          noValidate="novalidate"
          className="quickform"
        >
          <h3 className="quickform__title">Оформление заказа</h3>

          <div className="quickform__input-wrap">
            <input
              id="person"
              className={classNames(`input`, {
                ['error']: formErrors.person,
              })}
              name="form[contact][person]"
              value={formState.form.contact.person}
              onChange={handleChange}
              maxLength="100"
              type="text"
              placeholder="Имя"
              required
            />
            {formErrors.person && (
              <label className="error">{formErrors.person}</label>
            )}
          </div>
          <div className="quickform__input-wrap">
            <IMaskInput
              id="phone"
              className={classNames(`input`, {
                ['error']: formErrors.phone,
              })}
              placeholder="+7 999 999-99-99"
              type="tel"
              mask="+{7} {#00} 000-00-00"
              definitions={{ '#': /[01234569]/ }}
              name="form[contact][phone]"
              value={formState.form.contact.phone}
              unmask={false}
              onChange={handleChange}
              required
            />
            {formErrors.phone && (
              <label className="error">{formErrors.phone}</label>
            )}
          </div>
          <div className="quickform__input-wrap">
            <input
              id="email"
              className={classNames(`input`, {
                ['error']: formErrors.email && wantRegister,
              })}
              name="form[contact][email]"
              value={formState.form.contact.email}
              onChange={handleChange}
              maxLength="255"
              type="email"
              placeholder={`Email ${wantRegister ? '*' : ''}`}
              required={wantRegister ? 'required' : undefined}
            />
            {formErrors.email && wantRegister && (
              <label className="error">{formErrors.email}</label>
            )}
          </div>

          {!CLIENT_IS_LOGIN && (
            <>
              <label style={{ display: 'flex', gap: 15, alignItems: 'center' }}>
                <input
                  type="checkbox"
                  name="form[contact][want_register]"
                  value="1"
                  onChange={() =>
                    setLocalFormState({
                      ...localForm,
                      wantRegister: !wantRegister,
                    })
                  }
                />
                Я хочу зарегистрироваться
              </label>

              {wantRegister && (
                <div className="quickform__input-wrap">
                  <input
                    id="password"
                    className={classNames(`input`, {
                      ['error']: formErrors.password,
                    })}
                    type={showPassword ? 'text' : 'password'}
                    name="form[contact][pass]"
                    maxLength="50"
                    minLength="6"
                    placeholder="Придумайте пароль"
                    required
                  />
                  {formErrors.password && (
                    <label className="error">{formErrors.password}</label>
                  )}
                  <button
                    type="button"
                    className="show-password"
                    onClick={() => {
                      setLocalFormState({
                        ...localForm,
                        showPassword: !showPassword,
                      });
                    }}
                  >
                    <svg className={`icon ${showPassword ? '_active' : ''}`}>
                      <use xlinkHref={'/design/sprite.svg#hide-icon'}></use>
                    </svg>
                  </button>
                </div>
              )}
            </>
          )}
          {ORDER_DISCOUNT_COUPON_IS_ENABLED && (
            <div style={{ display: 'flex', gap: 20, alignItems: 'center' }}>
              <input
                id="couponCode"
                className="input"
                name="form[coupon_code]"
                value={couponCode}
                onChange={handleChange}
                maxLength="255"
                type="text"
                placeholder="Купон (123456)"
              />
              <button
                disabled={!couponCode}
                onClick={handleCouponBtn}
                className="button"
                type="button"
              >
                Применить
              </button>
            </div>
          )}
          {deliveries?.length ? (
            <>
              <select
                id="deliveryId"
                onChange={handleChange}
                name="form[delivery][id]"
                className="quickform__select"
                value={deliveryId}
              >
                {deliveries.map(({ id, name }) => (
                  <option value={id} key={id}>
                    {name} - (id:{id})
                  </option>
                ))}
              </select>
              {zoneList?.length ? (
                <select
                  id="deliveryZoneId"
                  onChange={handleChange}
                  name="form[delivery][zone_id]"
                  className="quickform__select"
                  value={zoneId}
                >
                  {zoneList.map(({ zoneId, name }) => (
                    <option value={zoneId} key={zoneId}>
                      {name} - (zoneId:{zoneId})
                    </option>
                  ))}
                </select>
              ) : null}

              <select
                id="paymentId"
                onChange={handleChange}
                name="form[payment][id]"
                className="quickform__select"
                value={paymentId}
              >
                {deliveries
                  .filter((el) => el.id === deliveryId)
                  .map((el) => {
                    return el.availablePaymentList.map(({ id, name }) => (
                      <option value={id} key={id}>
                        {name} -(id:{id})
                      </option>
                    ));
                  })}
              </select>
            </>
          ) : null}
          <hr />

          <Adresses
            quickFormData={quickFormData}
            handleChange={handleChange}
            formErrors={formErrors}
          />

          <div style={{ display: 'flex', gap: 5, alignItems: 'center' }}>
            <input
              type="checkbox"
              onChange={() =>
                setLocalFormState({
                  ...localForm,
                  extraDontCall: !extraDontCall,
                })
              }
              checked={extraDontCall}
              name="form[extra][Дозвон]"
              value="НЕ ПЕРЕЗВАНИВАТЬ"
              id="contactWantRegister"
            />
            <label htmlFor="contactWantRegister">Не перезванивать</label>
          </div>
          <button className="button _big" disabled={isOrderLoading}>
            {isOrderLoading ? 'Оформляется...' : 'Оформить'}
          </button>
        </form>
      </>
    );
  }

  function Preloader() {
    return (
      <div className="preloader _opacity">
        <span className="content-loading"></span>
      </div>
    );
  }

  function EmptyCart() {
    const { data: cartData, isSuccess } = useCart();
    const isCartEmpty =
      window.CART_IS_EMPTY || (!cartData?.CART_COUNT_TOTAL && isSuccess);

    if (!isCartEmpty) {
      return null;
    }

    return (
      <div className="empty-cart">
        <h3>Ваша корзина пуста</h3>
        <p>Вернитесь на главную и выберите интересующий товар.</p>
        <a className="button" href="/">
          Перейти на главную
        </a>
      </div>
    );
  }

  function Adresses({ quickFormData, handleChange, formErrors }) {
    // const Nouislider = window.ReactNouislider;
    const [formState] = useFormState();
    const {
      form: {
        delivery: {
          address_street: addressStreet,
          address_home: addressHome,
          address_flat: addressFlat,
        },
      },
    } = formState;
    const fullAddress = `Улица: ${addressStreet}, Дом/Корпус: ${addressHome}, Квартира: ${addressFlat}`;
    const [collapsed, setCollapsed] = useState(true);
    const {
      ORDER_FORM_CONTACT_ADDR,
      ORDER_FORM_CONTACT_CITY,
      ORDER_FORM_CONTACT_REGION,
      ORDER_FORM_CONTACT_ZIP_CODE,
      ORDER_FORM_CONTACT_COUNTRY,
      ORDER_FORM_DELIVERY_REGION,
      ORDER_FORM_DELIVERY_CITY,
      ORDER_FORM_DELIVERY_COUNTRY_ID,
      countryList,
      SETTINGS_ORDER_FIELDS,
      convenient_time_from_list,
      convenient_time_to_list,
    } = quickFormData;
    const { Country, ConvenientTime, ZipCode, Region, City, Address, Comment } =
      SETTINGS_ORDER_FIELDS;
    const [{ from, to }, setConvenientState] = useState({
      from: 0,
      to: 24,
    });
    const [date, setDate] = useState('');

    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);

    const formattedTomorrow = tomorrow
      .toLocaleDateString('ru', {
        year: 'numeric',
        month: 'numeric',
        day: 'numeric',
      })
      .split('.')
      .reverse()
      .join('-');

    return (
      <>
        {/* <!-- Адрес доставки--> */}
        <section className="quickform__row -adress form-callapse">
          <button
            type="button"
            className={classNames('form-callapse__title', {
              ['_active']: !collapsed,
            })}
            onClick={() => {
              setCollapsed(!collapsed);
            }}
          >
            <span className="quickform__title">Адрес доставки заказа</span>
          </button>
          <div
            className={classNames(
              'quickform__list -adress-inputs-list form-callapse__list',
              {
                ['_active']: !collapsed,
              }
            )}
          >
            <div>
              {/* <!-- Если поле страны доставки запрашивается --> */}
              {Country.isVisible && (
                <div className="quickform__item">
                  <div className="quickform__input-wrap">
                    <label className="quickform__label">
                      Выберите страну {Country.isRequired && <em>*</em>}
                    </label>
                    <select
                      placeholder="Выберите страну"
                      className="quickform__select"
                      id="country"
                      name="form[delivery][country_id]"
                      defaultValue={ORDER_FORM_DELIVERY_COUNTRY_ID}
                    >
                      <option value=""></option>
                      {countryList?.map(({ id, name }) => (
                        <option
                          key={id}
                          value={id}
                          // selected={id === ORDER_FORM_DELIVERY_COUNTRY_ID}
                          //  {% IF country_list.ID=ORDER_FORM_DELIVERY_COUNTRY_ID %}selected="selected"{% ENDIF %}
                        >
                          {name}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              )}

              {/* <!-- Если поле области запрашивается --> */}
              {Region.isVisible && (
                <div className="quickform__item">
                  <div className="quickform__input-wrap">
                    <label className="quickform__label">
                      Область {Region.isRequired && <em>*</em>}
                    </label>
                    <input
                      placeholder=""
                      type="text"
                      id="region"
                      name="form[delivery][region]"
                      defaultValue={ORDER_FORM_CONTACT_REGION}
                      maxLength="255"
                      className="input"
                      required={Region.isRequired}
                    />
                  </div>
                </div>
              )}

              {/* <!-- Если поле города запрашивается --> */}
              {City.isVisible && (
                <div className="quickform__item">
                  <div className="quickform__input-wrap">
                    <label className="quickform__label">
                      Город {City.isRequired && <em>*</em>}
                    </label>
                    <input
                      placeholder=""
                      type="text"
                      id="city"
                      name="form[delivery][city]"
                      defaultValue={ORDER_FORM_CONTACT_CITY}
                      maxLength="255"
                      onChange={handleChange}
                      className={classNames(`input`, {
                        ['error']: formErrors.city,
                      })}
                      required={City.isRequired}
                    />
                    {formErrors.city && (
                      <label className="error">{formErrors.city}</label>
                    )}
                  </div>
                </div>
              )}

              {/* <!-- Если поле адреса доставки запрашивается --> */}
              {Address.isVisible && (
                <>
                  {/* <!-- Улица --> */}
                  <div className="quickform__item">
                    <div className="quickform__input-wrap">
                      <label className="quickform__label">
                        Улица {Address.isRequired && <em>*</em>}
                      </label>
                      <input
                        placeholder=""
                        type="text"
                        id="addressStreet"
                        name="form[delivery][address_street]"
                        defaultValue=""
                        maxLength="500"
                        className="input"
                        onChange={handleChange}
                      />
                    </div>
                  </div>
                  {/* <!-- Поле Дом/Корпус --> */}
                  <div className="quickform__item -small -first">
                    <div className="quickform__input-wrap">
                      <label className="quickform__label">
                        Дом {Address.isRequired && <em>*</em>}
                      </label>
                      <input
                        placeholder=""
                        type="text"
                        id="addressHome"
                        name="form[delivery][address_home]"
                        defaultValue=""
                        maxLength="50"
                        className="input"
                        onChange={handleChange}
                      />
                    </div>
                  </div>
                  {/* <!-- Поле Квартира --> */}
                  <div className="quickform__item -small -second">
                    <div className="quickform__input-wrap">
                      <label className="quickform__label">
                        Квартира {Address.isRequired && <em>*</em>}
                      </label>
                      <input
                        placeholder=""
                        type="text"
                        id="addressFlat"
                        name="form[delivery][address_flat]"
                        defaultValue=""
                        maxLength="50"
                        className="input"
                        onChange={handleChange}
                      />
                    </div>
                  </div>

                  <input
                    placeholder=""
                    type="hidden"
                    id="address"
                    name="form[delivery][address]"
                    defaultValue={ORDER_FORM_CONTACT_ADDR || fullAddress}
                    maxLength="500"
                    className="input"
                  />
                </>
              )}

              {/* <!-- Если поле почтового индекса запрашивается --> */}
              {ZipCode.isVisible && (
                <div className="quickform__item -small -third">
                  <div className="quickform__input-wrap">
                    <label className="quickform__label">
                      Индекс {ZipCode.isRequired && <>*</>}
                    </label>
                    <input
                      placeholder=""
                      type="number"
                      id="zipCode"
                      name="form[delivery][zip_code]"
                      defaultValue={ORDER_FORM_CONTACT_ZIP_CODE}
                      minLength="5"
                      maxLength="6"
                      className={classNames(`input`, {
                        ['error']: formErrors.zipCode,
                      })}
                      onChange={handleChange}
                      required={ZipCode.isRequired}
                    />
                    {formErrors.zipCode && (
                      <label className="error">{formErrors.zipCode}</label>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* <!-- Если поле даты доставки запрашивается --> */}
            {ConvenientTime.isVisible && (
              <div className="quickform__list -deliveryConvenient">
                <div className="quickform__item -deliveryConvenientDate">
                  <div className="quickform__input-wrap">
                    <label className="quickform__label">
                      Дата доставки {ConvenientTime.isRequired && <em>*</em>}
                    </label>
                    <input
                      placeholder="01.01.2021"
                      type="date"
                      id="convenientDate"
                      name="form[delivery][convenient_date]"
                      value={date}
                      className="input quickform__input-deliveryConvenientDate"
                      autoComplete="off"
                      onChange={(evt) => {
                        const { value } = evt.target;

                        setDate(value);
                      }}
                      min={formattedTomorrow}
                    />
                  </div>
                </div>
                <div className="quickform__item -deliveryConvenientTime">
                  <div className="quickform__select-box _full">
                    {/* <input
                      type="hidden"
                      name="form[delivery][convenient_time_from]"
                      defaultValue={from}
                    />
                    <input
                      type="hidden"
                      name="form[delivery][convenient_time_to]"
                      defaultValue={to}
                    /> */}

                    <label className="quickform__label">
                      Удобное время доставки{' '}
                      {ConvenientTime.isRequired && <em>*</em>}
                    </label>
                    <div
                      style={{ display: 'flex', gap: 5, alignItems: 'center' }}
                    >
                      <div className="quickform__select-box -from">
                        <label className="quickform__label">С</label>
                        <select
                          id="convenientTimeFrom"
                          className="quickform__select-convenient _from"
                          name="form[delivery][convenient_time_from]"
                          defaultValue=""
                        >
                          <option value=""></option>
                          {convenient_time_from_list?.map(
                            ({ HOUR, HOUR_INT, SELECTED }) => (
                              <option
                                key={HOUR_INT}
                                value={HOUR_INT}
                                // selected={SELECTED ? 'selected' : ''}
                              >
                                {HOUR}
                              </option>
                            )
                          )}
                        </select>
                      </div>
                      <div className="quickform__select-box -to">
                        <label className="quickform__label">До</label>
                        <select
                          id="convenientTimeTo"
                          className="quickform__select-convenient _to"
                          name="form[delivery][convenient_time_to]"
                          defaultValue=""
                        >
                          <option value=""></option>
                          {convenient_time_to_list?.map(
                            ({ HOUR, HOUR_INT, SELECTED }) => (
                              <option
                                key={HOUR_INT}
                                value={HOUR_INT}
                                // selected={SELECTED ? 'selected' : ''}
                              >
                                {HOUR}
                              </option>
                            )
                          )}
                        </select>
                      </div>
                    </div>

                    {/* {false && (
                      <Nouislider
                        
                        style={{ marginTop: 6 }}
                        range={{ min: 0, max: 24 }}
                        start={[0, 24]}
                        step={1}
                        connect
                        tooltips
                        pips={{ mode: 'steps' }}
                        onSlide={(render, handle, value, un, percent) => {
                          const [firstValue, secondValue] = value;
                          setConvenentState({
                            from: firstValue,
                            to: secondValue,
                          });
                        }}
                      />
                    )} */}
                  </div>
                </div>
              </div>
            )}

            {/* <!-- Если поле комментарии запрашивается --> */}
            {Comment.isVisible && (
              <section className="quickform__row -comment">
                <div className="quickform__list">
                  <div className="quickform__item">
                    <label className="quickform__label">
                      Комментарий к заказу {Comment.isRequired && <>*</>}
                    </label>
                    <div className="quickform__input-wrap">
                      <textarea
                        required={Comment.isRequired}
                        onChange={handleChange}
                        cols="100"
                        rows="5"
                        id="comment"
                        name="form[delivery][comment]"
                        className={classNames(
                          `input textarea quickform-textarea`,
                          { ['error']: formErrors.comment }
                        )}
                      ></textarea>
                      {formErrors.comment && (
                        <label className="error">{formErrors.comment}</label>
                      )}
                    </div>
                  </div>
                </div>
              </section>
            )}
          </div>
        </section>
      </>
    );
  }
  function RelatedGoods({ refetchCart, cartData }) {
    const { cartRelatedGoods } = cartData || {};
    const [collapsed, setCollapsed] = useState(true);

    if (!cartRelatedGoods?.length) {
      return null;
    }

    return (
      <div className="form-callapse">
        <button
          type="button"
          className={classNames('form-callapse__title', {
            ['_active']: !collapsed,
          })}
          onClick={() => {
            setCollapsed(!collapsed);
          }}
        >
          <span className="quickform__title">С этим товаром покупают</span>
        </button>
        <div
          className={classNames(
            'quickform__list -adress-inputs-list form-callapse__list',
            {
              ['_active']: !collapsed,
            }
          )}
        >
          <ul
            style={{
              display: 'flex',
              gap: 20,
              listStyle: 'none',
              padding: 0,
              margin: 0,
              overflow: 'auto',
            }}
          >
            {cartRelatedGoods.map((item) => {
              return (
                <RelatedGoodItem
                  key={item.GOODS_MOD_ID}
                  item={item}
                  refetchCart={refetchCart}
                />
              );
            })}
          </ul>
        </div>
      </div>
    );
  }
  function RelatedGoodItem({ item, refetchCart }) {
    const addCartMutation = useAddCartMutation({
      onSuccess: refetchCart,
    });

    const onSubmitHandler = (event) => {
      event.preventDefault();

      const form = event.target;

      addCartMutation.mutate(form);
    };

    const {
      GOODS_MOD_ID,
      GOODS_NAME,
      MIN_PRICE_NOW_WITHOUT_DISCOUNT,
      ORDER_LINE_QUANTITY,
      GOODS_IMAGE,
    } = item;

    return (
      <li key={GOODS_MOD_ID} style={{ position: 'relative' }}>
        <form onSubmit={onSubmitHandler}>
          <input type="hidden" name="form[goods_mod_id]" value={GOODS_MOD_ID} />

          <div style={{ display: 'flex', gap: 20 }}>
            <h3>{GOODS_NAME}</h3>
          </div>
          {/* <div>
            <strong>Кол-во:{ORDER_LINE_QUANTITY}</strong>
          </div> */}
          <input
            // type="number"
            type="hidden"
            pattern="\d*"
            name="form[goods_mod_quantity]"
            max="4"
            defaultValue="1"
            min="1"
            title="Количество"
            className="input qty__input"
          />
          <div>
            <strong>Цена:{MIN_PRICE_NOW_WITHOUT_DISCOUNT}</strong>
          </div>
          <img width="80" src={GOODS_IMAGE} />
          <div>
            <button className="button">
              {addCartMutation.isLoading ? 'Добавляется...' : 'В корзину'}
            </button>
          </div>
        </form>
      </li>
    );
  }
  function RecentlyViewed({ refetchCart, cartData }) {
    const { recentlyViewedGoods } = cartData || {};
    const recentlyViewedGoodsFiltered = recentlyViewedGoods.filter(
      (item) => !item.NB_GOODS_IN_CART
    );
    const [collapsed, setCollapsed] = useState(true);

    if (!recentlyViewedGoodsFiltered?.length) {
      return null;
    }

    return (
      <div className="form-callapse">
        <button
          type="button"
          className={classNames('form-callapse__title', {
            ['_active']: !collapsed,
          })}
          onClick={() => {
            setCollapsed(!collapsed);
          }}
        >
          <span className="quickform__title">Вы смотрели</span>
        </button>
        <div
          className={classNames('form-callapse__list', {
            ['_active']: !collapsed,
          })}
        >
          <ul
            style={{
              display: 'flex',
              gap: 20,
              listStyle: 'none',
              padding: 0,
              margin: 0,
              overflow: 'auto',
            }}
          >
            {recentlyViewedGoodsFiltered.map((item) => {
              return (
                <RecentlyViewedItem
                  key={item.GOODS_MOD_ID}
                  item={item}
                  refetchCart={refetchCart}
                />
              );
            })}
          </ul>
        </div>
      </div>
    );
  }
  function RecentlyViewedItem({ item, refetchCart }) {
    const addCartMutation = useAddCartMutation({
      onSuccess: refetchCart,
    });

    const onSubmitHandler = (event) => {
      event.preventDefault();

      const form = event.target;

      addCartMutation.mutate(form);
    };

    const {
      GOODS_MOD_ID,
      GOODS_NAME,
      MIN_PRICE_NOW_WITHOUT_DISCOUNT,
      ORDER_LINE_QUANTITY,
      GOODS_IMAGE,
    } = item;

    return (
      <li key={GOODS_MOD_ID} style={{ position: 'relative' }}>
        <form onSubmit={onSubmitHandler}>
          <input type="hidden" name="form[goods_mod_id]" value={GOODS_MOD_ID} />

          <div style={{ display: 'flex', gap: 20 }}>
            <h3>{GOODS_NAME}</h3>
          </div>
          {/* <div>
            <strong>Кол-во:{ORDER_LINE_QUANTITY}</strong>
          </div> */}
          <input
            // type="number"
            type="hidden"
            pattern="\d*"
            name="form[goods_mod_quantity]"
            max="4"
            defaultValue="1"
            min="1"
            title="Количество"
            className="input qty__input"
          />
          <div>
            <strong>Цена:{MIN_PRICE_NOW_WITHOUT_DISCOUNT}</strong>
          </div>
          <img width="80" src={GOODS_IMAGE} />
          <div>
            <button className="button">
              {addCartMutation.isLoading ? 'Добавляется...' : 'В корзину'}
            </button>
          </div>
        </form>
      </li>
    );
  }
})();

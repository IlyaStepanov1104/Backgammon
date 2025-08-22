#!/usr/bin/env node

const BASE_URL = 'http://localhost:3000/api/admin/promocodes';

async function testPromocodesAPI() {
  console.log('🧪 Тестирование API промокодов...\n');

  try {
    // 1. Тест GET - получение списка промокодов
    console.log('1️⃣ Тестируем GET /api/admin/promocodes...');
    const getResponse = await fetch(`${BASE_URL}?page=1&limit=5`);
    const getData = await getResponse.json();
    
    if (getResponse.ok) {
      console.log('✅ GET успешен');
      console.log(`   Найдено промокодов: ${getData.promocodes?.length || 0}`);
      console.log(`   Всего: ${getData.pagination?.total || 0}`);
    } else {
      console.log('❌ GET неуспешен:', getData.error);
    }

    // 2. Тест POST - создание промокода
    console.log('\n2️⃣ Тестируем POST /api/admin/promocodes...');
    const newPromocode = {
      code: 'TEST123',
      description: 'Тестовый промокод для проверки API',
      maxUses: 10,
      cardPackageSize: 5,
      expiresAt: '2024-12-31T23:59:59.000Z',
      isActive: true
    };

    const postResponse = await fetch(BASE_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(newPromocode)
    });

    const postData = await postResponse.json();
    
    if (postResponse.ok) {
      console.log('✅ POST успешен');
      console.log(`   Создан промокод с ID: ${postData.promocodeId}`);
      
      // Сохраняем ID для последующих тестов
      const promocodeId = postData.promocodeId;
      
      // 3. Тест PUT - обновление промокода
      console.log('\n3️⃣ Тестируем PUT /api/admin/promocodes...');
      const updatedPromocode = {
        ...newPromocode,
        id: promocodeId,
        description: 'Обновленное описание тестового промокода',
        maxUses: 15
      };

      const putResponse = await fetch(BASE_URL, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(updatedPromocode)
      });

      const putData = await putResponse.json();
      
      if (putResponse.ok) {
        console.log('✅ PUT успешен');
        console.log(`   Промокод ${promocodeId} обновлен`);
      } else {
        console.log('❌ PUT неуспешен:', putData.error);
      }

      // 4. Тест PATCH - активация/деактивация
      console.log('\n4️⃣ Тестируем PATCH /api/admin/promocodes...');
      const patchResponse = await fetch(BASE_URL, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          id: promocodeId,
          action: 'deactivate'
        })
      });

      const patchData = await patchResponse.json();
      
      if (patchResponse.ok) {
        console.log('✅ PATCH успешен');
        console.log(`   Промокод ${promocodeId} деактивирован`);
      } else {
        console.log('❌ PATCH неуспешен:', patchData.error);
      }

      // 5. Тест DELETE - удаление промокода
      console.log('\n5️⃣ Тестируем DELETE /api/admin/promocodes...');
      const deleteResponse = await fetch(`${BASE_URL}?id=${promocodeId}`, {
        method: 'DELETE'
      });

      const deleteData = await deleteResponse.json();
      
      if (deleteResponse.ok) {
        console.log('✅ DELETE успешен');
        console.log(`   Промокод ${promocodeId} удален`);
      } else {
        console.log('❌ DELETE неуспешен:', deleteData.error);
      }

    } else {
      console.log('❌ POST неуспешен:', postData.error);
    }

    // 6. Тест статистики
    console.log('\n6️⃣ Тестируем GET /api/admin/promocodes/stats...');
    const statsResponse = await fetch(`${BASE_URL}/stats`);
    const statsData = await statsResponse.json();
    
    if (statsResponse.ok) {
      console.log('✅ Статистика получена');
      console.log(`   Всего промокодов: ${statsData.stats?.total || 0}`);
      console.log(`   Активных: ${statsData.stats?.active || 0}`);
      console.log(`   Истекших: ${statsData.stats?.expired || 0}`);
    } else {
      console.log('❌ Статистика не получена:', statsData.error);
    }

    // 7. Тест валидации
    console.log('\n7️⃣ Тестируем POST /api/admin/promocodes/validate...');
    const validateResponse = await fetch(`${BASE_URL}/validate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ code: 'INVALID' })
    });

    const validateData = await validateResponse.json();
    
    if (validateResponse.ok) {
      console.log('✅ Валидация работает');
      console.log(`   Результат: ${validateData.valid ? 'валиден' : 'невалиден'}`);
      if (!validateData.valid) {
        console.log(`   Ошибка: ${validateData.error}`);
      }
    } else {
      console.log('❌ Валидация не работает:', validateData.error);
    }

    // 8. Тест экспорта
    console.log('\n8️⃣ Тестируем GET /api/admin/promocodes/export...');
    const exportResponse = await fetch(`${BASE_URL}/export?format=json`);
    const exportData = await exportResponse.json();
    
    if (exportResponse.ok) {
      console.log('✅ Экспорт работает');
      console.log(`   Экспортировано: ${exportData.exportInfo?.total || 0} промокодов`);
    } else {
      console.log('❌ Экспорт не работает:', exportData.error);
    }

  } catch (error) {
    console.error('❌ Ошибка тестирования:', error.message);
  }

  console.log('\n🏁 Тестирование API промокодов завершено');
}

// Запускаем тесты
testPromocodesAPI().catch(console.error);

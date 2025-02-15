import axios from 'axios';
import { setTimeout } from 'timers/promises';

const API_URL = 'http://localhost:3000/api';
let adminToken: string;
let client1Token: string;
let client2Token: string;
let products: any = {};

async function waitForServer() {
  let retries = 0;
  const maxRetries = 10;
  
  while (retries < maxRetries) {
    try {
      await axios.get(`http://localhost:3000/health`);
      console.log('Server is ready');
      return;
    } catch (error) {
      console.log('Waiting for server to be ready...');
      await setTimeout(2000);
      retries++;
    }
  }
  throw new Error('Server did not become ready in time');
}

async function registerUser(userData: any) {
  try {
    const response = await axios.post(`${API_URL}/auth/register`, userData);
    console.log(`Usuario registrado: ${userData.email}`);
    return response.data.token;
  } catch (error) {
    if (error.response?.status === 400 && error.response?.data?.error === 'Email already registered') {
      console.log(`Usuario ${userData.email} ya existe, intentando login...`);
      return loginUser({
        email: userData.email,
        password: userData.password
      });
    }
    console.error(`Error registrando usuario ${userData.email}:`, error.response?.data || error.message);
    throw error;
  }
}

async function loginUser(credentials: any) {
  try {
    const response = await axios.post(`${API_URL}/auth/login`, credentials);
    console.log(`Usuario logueado: ${credentials.email}`);
    return response.data.token;
  } catch (error) {
    console.error(`Error logueando usuario ${credentials.email}:`, error.response?.data || error.message);
    throw error;
  }
}

async function createProduct(productData: any, token: string) {
  try {
    const response = await axios.post(`${API_URL}/products`, productData, {
      headers: { Authorization: `Bearer ${token}` }
    });
    console.log(`Producto creado: ${productData.name}`);
    console.log('Product response:', JSON.stringify(response.data, null, 2));
    return response.data;
  } catch (error) {
    console.error(`Error creando producto ${productData.name}:`, error.response?.data || error.message);
    throw error;
  }
}

async function addToCart(userId: string, productId: string, quantity: number, token: string) {
  try {
    const response = await axios.post(
      `${API_URL}/cart/add`,
      { productId, quantity },
      { headers: { Authorization: `Bearer ${token}` } }
    );
    console.log(`Producto agregado al carrito de ${userId}`);
    return response.data;
  } catch (error) {
    console.error(`Error agregando producto al carrito:`, error.response?.data || error.message);
    throw error;
  }
}

async function createOrder(userId: string, orderData: any, token: string) {
  try {
    const response = await axios.post(
      `${API_URL}/orders`,
      orderData,
      { headers: { Authorization: `Bearer ${token}` } }
    );
    console.log(`Pedido creado para ${userId}`);
    return response.data;
  } catch (error) {
    console.error(`Error creando pedido:`, error.response?.data || error.message);
    throw error;
  }
}

async function updateOrderStatus(orderId: string, status: string, token: string) {
  try {
    const response = await axios.patch(
      `${API_URL}/orders/${orderId}/status`,
      { status },
      { headers: { Authorization: `Bearer ${token}` } }
    );
    console.log(`Estado de pedido actualizado: ${status}`);
    return response.data;
  } catch (error) {
    console.error(`Error actualizando estado de pedido:`, error.response?.data || error.message);
    throw error;
  }
}

async function updatePaymentStatus(orderId: string, status: string, token: string) {
  try {
    const response = await axios.patch(
      `${API_URL}/orders/${orderId}/payment`,
      { status },
      { headers: { Authorization: `Bearer ${token}` } }
    );
    console.log(`Estado de pago actualizado: ${status}`);
    return response.data;
  } catch (error) {
    console.error(`Error actualizando estado de pago:`, error.response?.data || error.message);
    throw error;
  }
}

async function populateData() {
  try {
    console.log('Iniciando población de datos de demo...');

    // Wait for server to be ready
    await waitForServer();

    // 1. Registrar usuarios
    console.log('\n1. Registrando usuarios...');
    adminToken = await registerUser({
      email: 'admin@demo.com',
      password: 'admin123456',
      firstName: 'Admin',
      lastName: 'User',
      role: 'admin'
    });

    client1Token = await registerUser({
      email: 'cliente1@demo.com',
      password: 'cliente123456',
      firstName: 'Juan',
      lastName: 'Pérez'
    });

    client2Token = await registerUser({
      email: 'cliente2@demo.com',
      password: 'cliente123456',
      firstName: 'María',
      lastName: 'González'
    });

    // Esperar un momento para que se procesen los registros
    await setTimeout(1000);

    // 2. Crear productos
    console.log('\n2. Creando productos...');
    products.iphone = await createProduct({
      name: 'iPhone 14 Pro',
      description: 'El último iPhone con la mejor cámara y rendimiento',
      sku: 'IPH-14PRO-128',
      category: 'smartphones',
      price: 999.99,
      stock: 50,
      images: [
        'https://example.com/images/iphone14pro-1.jpg',
        'https://example.com/images/iphone14pro-2.jpg'
      ],
      specifications: {
        storage: '128GB',
        color: 'Space Black',
        screen: '6.1 inch',
        camera: '48MP'
      }
    }, adminToken);

    products.macbook = await createProduct({
      name: 'MacBook Pro M2',
      description: 'Laptop profesional con el chip M2',
      sku: 'MBP-M2-256',
      category: 'laptops',
      price: 1299.99,
      stock: 30,
      images: [
        'https://example.com/images/macbookm2-1.jpg',
        'https://example.com/images/macbookm2-2.jpg'
      ],
      specifications: {
        processor: 'Apple M2',
        storage: '256GB',
        ram: '8GB',
        screen: '13.3 inch'
      }
    }, adminToken);

    products.ipad = await createProduct({
      name: 'iPad Air',
      description: 'iPad Air con chip M1',
      sku: 'IPAD-AIR-64',
      category: 'tablets',
      price: 599.99,
      stock: 40,
      images: [
        'https://example.com/images/ipadair-1.jpg',
        'https://example.com/images/ipadair-2.jpg'
      ],
      specifications: {
        storage: '64GB',
        color: 'Space Gray',
        screen: '10.9 inch',
        chip: 'M1'
      }
    }, adminToken);

    // 3. Simular interacciones de usuario
    console.log('\n3. Simulando interacciones de usuario...');
    
    // Cliente 1: Agregar productos al carrito
    await addToCart('cliente1', products.iphone._id, 1, client1Token);
    await addToCart('cliente1', products.macbook._id, 1, client1Token);

    // Cliente 1: Crear pedido
    const order1 = await createOrder('cliente1', {
      shippingAddress: {
        street: 'Av. Corrientes 1234',
        city: 'Buenos Aires',
        state: 'CABA',
        zipCode: 'C1043AAZ',
        country: 'Argentina'
      },
      paymentInfo: {
        method: 'credit_card',
        transactionId: 'TRANS-001'
      }
    }, client1Token);

    // Cliente 2: Agregar productos al carrito
    await addToCart('cliente2', products.ipad._id, 2, client2Token);

    // Cliente 2: Crear pedido
    const order2 = await createOrder('cliente2', {
      shippingAddress: {
        street: 'Av. Santa Fe 2345',
        city: 'Buenos Aires',
        state: 'CABA',
        zipCode: 'C1123AAZ',
        country: 'Argentina'
      },
      paymentInfo: {
        method: 'debit_card',
        transactionId: 'TRANS-002'
      }
    }, client2Token);

    // 4. Actualizar estados de pedidos
    console.log('\n4. Actualizando estados de pedidos...');
    await updateOrderStatus(order1._id, 'processing', adminToken);
    await updatePaymentStatus(order1._id, 'completed', adminToken);
    await updateOrderStatus(order2._id, 'processing', adminToken);
    await updatePaymentStatus(order2._id, 'completed', adminToken);

    console.log('\n¡Datos de demo populados exitosamente!');
    console.log('\nTokens generados:');
    console.log('Admin:', adminToken);
    console.log('Cliente 1:', client1Token);
    console.log('Cliente 2:', client2Token);
    console.log('\nIDs de productos:');
    console.log('iPhone:', products.iphone._id);
    console.log('MacBook:', products.macbook._id);
    console.log('iPad:', products.ipad._id);
    console.log('\nIDs de pedidos:');
    console.log('Pedido 1:', order1._id);
    console.log('Pedido 2:', order2._id);

  } catch (error) {
    console.error('Error durante la población de datos:', error);
  }
}

// Ejecutar el script
populateData(); 
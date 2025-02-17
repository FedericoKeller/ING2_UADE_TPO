import axios from 'axios';

const API_URL = 'http://localhost:3000/api';
let adminToken: string;
let client1Token: string;
let client2Token: string;

// Interfaces
interface Product {
  _id: string;
  name: string;
  price: number;
  stock: number;
}

interface User {
  _id: string;
  email: string;
  token: string;
}

interface Order {
  _id: string;
  total: number;
}

interface Invoice {
  _id: string;
  invoiceNumber: string;
  total: number;
}

// Productos
const products: { [key: string]: Product } = {};

// Almacenar pedidos
const orders: { client1: any[], client2: any } = {
  client1: [],
  client2: null
};

const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

async function waitForServer() {
  let retries = 0;
  const maxRetries = 30;
  const retryDelay = 5000;
  
  while (retries < maxRetries) {
    try {
      await axios.get(`http://localhost:3000/health`);
      console.log('Server is ready');
      return;
    } catch (error) {
      retries++;
      console.log(`Waiting for server... (${retries}/${maxRetries})`);
      await sleep(retryDelay);
    }
  }
  throw new Error('Server did not become ready in time');
}

async function registerUser(userData: any): Promise<User> {
  try {
    const response = await axios.post(`${API_URL}/auth/register`, userData);
    console.log(`User registered: ${userData.email}`);
    return {
      _id: response.data.user.id,
      email: userData.email,
      token: response.data.token
    };
  } catch (error) {
    console.error(`Error registering user ${userData.email}:`, error);
    throw error;
  }
}

async function loginUser(credentials: any): Promise<string> {
  try {
    const response = await axios.post(`${API_URL}/auth/login`, credentials);
    console.log(`User logged in: ${credentials.email}`);
    return response.data.token;
  } catch (error) {
    console.error(`Error logging in user ${credentials.email}:`, error);
    throw error;
  }
}

async function createProduct(productData: any, token: string): Promise<Product> {
  try {
    const response = await axios.post(`${API_URL}/products`, productData, {
      headers: { Authorization: `Bearer ${token}` }
    });
    console.log(`Product created: ${productData.name}`);
    return response.data;
  } catch (error) {
    console.error(`Error creating product ${productData.name}:`, error);
    throw error;
  }
}

async function addToCart(userId: string, productId: string, quantity: number, token: string): Promise<void> {
  try {
    await axios.post(`${API_URL}/cart/add`, 
      { productId, quantity },
      { headers: { Authorization: `Bearer ${token}` } }
    );
    console.log(`Added product ${productId} to cart for user ${userId}`);
  } catch (error) {
    console.error(`Error adding product to cart:`, error);
    throw error;
  }
}

async function createOrder(userId: string, orderData: any, token: string): Promise<Order> {
  try {
    const response = await axios.post(`${API_URL}/orders`,
      orderData,
      { headers: { Authorization: `Bearer ${token}` } }
    );
    console.log(`Order created for user ${userId}`);
    return response.data;
  } catch (error) {
    console.error(`Error creating order:`, error);
    throw error;
  }
}

async function createInvoice(orderId: string, token: string): Promise<Invoice> {
  try {
    const response = await axios.post(`${API_URL}/invoices/order/${orderId}`,
      {},
      { headers: { Authorization: `Bearer ${token}` } }
    );
    console.log(`Invoice created for order ${orderId}`);
    return response.data;
  } catch (error) {
    console.error(`Error creating invoice:`, error);
    throw error;
  }
}

async function updateInvoiceStatus(invoiceId: string, status: string, token: string): Promise<void> {
  try {
    await axios.patch(`${API_URL}/invoices/${invoiceId}/status`,
      { status },
      { headers: { Authorization: `Bearer ${token}` } }
    );
    console.log(`Invoice ${invoiceId} status updated to ${status}`);
  } catch (error) {
    console.error(`Error updating invoice status:`, error);
    throw error;
  }
}

async function simulateProductInteraction(userId: string, productId: string, token: string, productName: string): Promise<void> {
  try {
    await axios.post(`${API_URL}/products/${productId}/interaction`,
      {
        action: 'VIEW',
        productName
      },
      { headers: { Authorization: `Bearer ${token}` } }
    );
    console.log(`Recorded interaction for user ${userId} with product ${productId}`);
  } catch (error) {
    console.error(`Error recording interaction:`, error);
    throw error;
  }
}

async function updateOrderStatus(orderId: string, status: string, token: string): Promise<void> {
  try {
    await axios.patch(
      `${API_URL}/orders/${orderId}/status`,
      { status },
      { headers: { Authorization: `Bearer ${token}` } }
    );
    console.log(`Order status updated: ${orderId} -> ${status}`);
  } catch (error) {
    console.error(`Error updating order status:`, error);
    throw error;
  }
}

async function updatePaymentStatus(orderId: string, status: string, token: string): Promise<void> {
  try {
    await axios.patch(
      `${API_URL}/orders/${orderId}/payment`,
      { status },
      { headers: { Authorization: `Bearer ${token}` } }
    );
    console.log(`Payment status updated: ${orderId} -> ${status}`);
  } catch (error) {
    console.error(`Error updating payment status:`, error);
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
    const admin = await registerUser({
      email: 'admin@demo.com',
      password: 'admin123456',
      firstName: 'Admin',
      lastName: 'User',
      role: 'admin'
    });

    const client1 = await registerUser({
      email: 'cliente1@demo.com',
      password: 'cliente123456',
      firstName: 'Juan',
      lastName: 'Pérez'
    });

    const client2 = await registerUser({
      email: 'cliente2@demo.com',
      password: 'cliente123456',
      firstName: 'María',
      lastName: 'González'
    });

    // Esperar un momento para que se procesen los registros
    await sleep(1000);

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
    }, admin.token);

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
    }, admin.token);

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
    }, admin.token);

    // Productos adicionales
    products.airpods = await createProduct({
      name: 'AirPods Pro',
      description: 'Auriculares inalámbricos con cancelación de ruido',
      sku: 'APP-2GEN',
      category: 'accessories',
      price: 249.99,
      stock: 100,
      images: ['https://example.com/images/airpods-1.jpg'],
      specifications: {
        type: 'In-ear',
        battery: '6 hours',
        features: ['Noise Cancellation', 'Transparency Mode']
      }
    }, admin.token);

    products.appleWatch = await createProduct({
      name: 'Apple Watch Series 8',
      description: 'Smartwatch con monitor de salud avanzado',
      sku: 'AWS-8-45MM',
      category: 'wearables',
      price: 399.99,
      stock: 45,
      images: ['https://example.com/images/watch-1.jpg'],
      specifications: {
        size: '45mm',
        color: 'Midnight',
        features: ['ECG', 'Blood Oxygen']
      }
    }, admin.token);

    products.monitor = await createProduct({
      name: 'Studio Display',
      description: 'Monitor 5K Retina de 27 pulgadas',
      sku: 'STD-27-5K',
      category: 'monitors',
      price: 1599.99,
      stock: 20,
      images: ['https://example.com/images/display-1.jpg'],
      specifications: {
        resolution: '5K',
        size: '27 inch',
        brightness: '600 nits'
      }
    }, admin.token);

    products.keyboard = await createProduct({
      name: 'Magic Keyboard',
      description: 'Teclado inalámbrico con Touch ID',
      sku: 'MGK-TOUCH',
      category: 'accessories',
      price: 149.99,
      stock: 80,
      images: ['https://example.com/images/keyboard-1.jpg'],
      specifications: {
        layout: 'Spanish',
        color: 'Silver',
        features: ['Touch ID', 'Numeric Pad']
      }
    }, admin.token);

    products.mouse = await createProduct({
      name: 'Magic Mouse',
      description: 'Mouse inalámbrico con superficie Multi-Touch',
      sku: 'MGM-3',
      category: 'accessories',
      price: 79.99,
      stock: 120,
      images: ['https://example.com/images/mouse-1.jpg'],
      specifications: {
        color: 'White',
        battery: 'Rechargeable',
        connectivity: 'Bluetooth'
      }
    }, admin.token);

    products.pencil = await createProduct({
      name: 'Apple Pencil',
      description: 'Lápiz digital de segunda generación',
      sku: 'APL-2GEN',
      category: 'accessories',
      price: 129.99,
      stock: 90,
      images: ['https://example.com/images/pencil-1.jpg'],
      specifications: {
        generation: '2nd',
        compatibility: 'iPad Pro, iPad Air',
        features: ['Wireless Charging', 'Magnetic Attachment']
      }
    }, admin.token);

    products.homepod = await createProduct({
      name: 'HomePod mini',
      description: 'Altavoz inteligente compacto',
      sku: 'HPD-MINI',
      category: 'speakers',
      price: 99.99,
      stock: 60,
      images: ['https://example.com/images/homepod-1.jpg'],
      specifications: {
        color: 'Space Gray',
        features: ['Siri', '360º Audio'],
        height: '3.3 inches'
      }
    }, admin.token);

    products.magsafe = await createProduct({
      name: 'MagSafe Charger',
      description: 'Cargador inalámbrico magnético',
      sku: 'MGS-CHG',
      category: 'accessories',
      price: 39.99,
      stock: 150,
      images: ['https://example.com/images/magsafe-1.jpg'],
      specifications: {
        power: '15W',
        compatibility: 'iPhone 12 and later',
        type: 'Wireless'
      }
    }, admin.token);

    products.airtag = await createProduct({
      name: 'AirTag',
      description: 'Localizador de objetos',
      sku: 'ATG-1PK',
      category: 'accessories',
      price: 29.99,
      stock: 200,
      images: ['https://example.com/images/airtag-1.jpg'],
      specifications: {
        battery: 'CR2032',
        features: ['Precision Finding', 'Lost Mode'],
        waterResistant: 'IP67'
      }
    }, admin.token);

    // 3. Simular interacciones de usuario
    console.log('\n3. Simulando interacciones de usuario...');
    
    // Crear un conjunto base de productos con los que ambos usuarios interactuarán
    const commonProducts = [
      { id: products.iphone._id, name: products.iphone.name },
      { id: products.macbook._id, name: products.macbook.name },
      { id: products.ipad._id, name: products.ipad.name }
    ];

    // Cliente 1: Interactuar con productos base y adicionales
    console.log('\nSimulando interacciones para Cliente 1...');
    const client1Products = [
      ...commonProducts,
      { id: products.airpods._id, name: products.airpods.name },
      { id: products.appleWatch._id, name: products.appleWatch.name },
      { id: products.monitor._id, name: products.monitor.name }
    ];
    
    for (const product of client1Products) {
      // Simular múltiples interacciones para crear un perfil más robusto
      await simulateProductInteraction(client1._id, product.id, client1.token, product.name);
      await sleep(200);
      if (Math.random() > 0.3) { // 70% chance of a second view
        await simulateProductInteraction(client1._id, product.id, client1.token, product.name);
        await sleep(200);
      }
    }

    // Cliente 2: Interactuar con productos base y adicionales diferentes
    console.log('\nSimulando interacciones para Cliente 2...');
    const client2Products = [
      ...commonProducts,
      { id: products.keyboard._id, name: products.keyboard.name },
      { id: products.mouse._id, name: products.mouse.name },
      { id: products.pencil._id, name: products.pencil.name }
    ];
    
    for (const product of client2Products) {
      // Simular múltiples interacciones para crear un perfil más robusto
      await simulateProductInteraction(client2._id, product.id, client2.token, product.name);
      await sleep(200);
      if (Math.random() > 0.3) { // 70% chance of a second view
        await simulateProductInteraction(client2._id, product.id, client2.token, product.name);
        await sleep(200);
      }
    }

    // Cliente 1: Crear pedidos para alcanzar categoría TOP
    const shippingAddress = {
      street: 'Av. Corrientes 1234',
      city: 'Buenos Aires',
      state: 'CABA',
      zipCode: 'C1043AAZ',
      country: 'Argentina'
    };

    const products_array = Object.values(products);
    for(let i = 0; i < 11; i++) {
      // Seleccionar 1-3 productos aleatorios para cada orden
      const numProducts = Math.floor(Math.random() * 3) + 1;
      for(let j = 0; j < numProducts; j++) {
        const randomProduct = products_array[Math.floor(Math.random() * products_array.length)];
        
        // Simular interacciones antes de agregar al carrito
        await simulateProductInteraction(client1._id, randomProduct._id, client1.token, randomProduct.name);
        await sleep(200); // Pequeña pausa entre interacciones
        
        await addToCart(client1._id, randomProduct._id, 1, client1.token);
      }

      // Crear pedido
      const order = await createOrder(client1._id, {
        shippingAddress,
        paymentInfo: {
          method: 'credit_card',
          transactionId: `TRANS-C1-${i + 1}`
        }
      }, client1.token);

      // Guardar el pedido
      orders.client1.push(order);

      // Actualizar estados del pedido
      await updateOrderStatus(order._id, 'processing', admin.token);
      await updatePaymentStatus(order._id, 'completed', admin.token);
      await sleep(500);

      // Crear y actualizar factura
      const invoice = await createInvoice(order._id, admin.token);
      await updateInvoiceStatus(invoice._id, 'paid', admin.token);
    }

    // Cliente 2: Mantener la lógica original pero agregar interacciones
    await simulateProductInteraction(client2._id, products.ipad._id, client2.token, products.ipad.name);
    await sleep(200);
    await addToCart(client2._id, products.ipad._id, 2, client2.token);

    // Simular algunas interacciones adicionales sin compra para el cliente2
    const otherProducts = [
      { id: products.iphone._id, name: products.iphone.name },
      { id: products.macbook._id, name: products.macbook.name },
      { id: products.airpods._id, name: products.airpods.name }
    ];
    for (const product of otherProducts) {
      await simulateProductInteraction(client2._id, product.id, client2.token, product.name);
      await sleep(200);
    }

    // Cliente 2: Crear pedido
    const order2 = await createOrder(client2._id, {
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
    }, client2.token);

    // Guardar el pedido del cliente 2
    orders.client2 = order2;

    // 4. Actualizar estados de pedidos
    console.log('\n4. Actualizando estados de pedidos...');
    await updateOrderStatus(order2._id, 'processing', admin.token);
    await updatePaymentStatus(order2._id, 'pending', admin.token);
    await sleep(500);

    const invoice2 = await createInvoice(order2._id, admin.token);
    await updateInvoiceStatus(invoice2._id, 'pending', admin.token);

    console.log('\n¡Datos de demo populados exitosamente!');
    console.log('\nTokens generados:');
    console.log('Admin:', admin.token);
    console.log('Cliente 1:', client1.token);
    console.log('Cliente 2:', client2.token);
    
    console.log('\nIDs de productos:');
    Object.entries(products).forEach(([key, product]) => {
      console.log(`${key}: ${product._id} (${product.name})`);
    });

    console.log('\nIDs de pedidos:');
    console.log('Cliente 1:');
    orders.client1.forEach((order, index) => {
      console.log(`  Pedido ${index + 1}: ${order._id}`);
    });
    console.log('\nCliente 2:');
    console.log(`  Pedido 1: ${orders.client2._id}`);

  } catch (error) {
    console.error('Error durante la población de datos:', error);
  } finally {
    process.exit();
  }
}

// Ejecutar el script
populateData(); 
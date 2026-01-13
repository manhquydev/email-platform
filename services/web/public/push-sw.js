
self.addEventListener('push', function(event) {
  if (event.data) {
    const data = event.data.json();
    const options = {
      body: data.message || 'Bạn có thông báo mới',
      icon: '/favicon.svg',
      badge: '/favicon.svg',
      vibrate: [100, 50, 100],
      data: {
        dateOfArrival: Date.now(),
        primaryKey: '2',
        url: data.url || '/'
      },
      actions: [
        {action: 'explore', title: 'Xem chi tiết'}
      ]
    };

    // Customize icon/image if provided
    if (data.imageUrl) {
        options.image = data.imageUrl;
    }

    event.waitUntil(
      self.registration.showNotification(data.title || 'Ephemera', options)
    );
  }
});

self.addEventListener('notificationclick', function(event) {
  event.notification.close();

  // Handle notification click
  if (event.action === 'explore') {
    // Open the specific URL
    event.waitUntil(
      clients.openWindow(event.notification.data.url)
    );
  } else {
    // Default click behavior
    event.waitUntil(
      clients.openWindow(event.notification.data.url)
    );
  }
});

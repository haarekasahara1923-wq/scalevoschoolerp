self.addEventListener('push', function (event) {
  if (!event.data) return;

  let data = { title: 'Sclevo School ERP', body: 'You have a new message', url: '/portal', tag: 'sclevo-msg' };
  try {
    data = { ...data, ...JSON.parse(event.data.text()) };
  } catch (e) {
    data.body = event.data.text();
  }

  const options = {
    body: data.body,
    icon: '/icons/icon-192.png',
    badge: '/icons/icon-192.png',
    vibrate: [200, 100, 200],
    silent: false,
    renotify: true,
    tag: data.tag || 'sclevo-msg',
    data: {
      url: data.url || '/portal',
      dateOfArrival: Date.now(),
    },
  };

  event.waitUntil(
    Promise.all([
      self.registration.showNotification(data.title, options),
      // Also notify any open window/tab so it plays the custom chime immediately
      self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
        for (const client of clientList) {
          client.postMessage({
            type: 'PLAY_NOTIFICATION_SOUND',
            title: data.title,
            body: data.body,
          });
        }
      }),
    ])
  );
});

self.addEventListener('notificationclick', function (event) {
  event.notification.close();
  const targetUrl = (event.notification.data && event.notification.data.url) || '/portal';
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if ('focus' in client) {
          return client.focus();
        }
      }
      if (self.clients.openWindow) {
        return self.clients.openWindow(targetUrl);
      }
    })
  );
});

'use strict';

self.addEventListener('push', function (event) {
    const data = event.data ? JSON.parse(event.data.text()) : {};
    const title = data.title || 'Pawnecta';
    const options = {
        body: data.message || 'Tienes una nueva notificación.',
        icon: '/icon-192x192.png',
        badge: '/icon-192x192.png',
        data: { url: data.url || '/' }
    };

    event.waitUntil(
        self.registration.showNotification(title, options)
    );
});

self.addEventListener('notificationclick', function (event) {
    event.notification.close();
    event.waitUntil(
        self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(function (clientList) {
            // Validate URL: only allow same-origin paths to prevent open redirect
            var rawUrl = event.notification.data.url || '/';
            var parsed = new URL(rawUrl, self.location.origin);
            var urlToOpen = parsed.origin === self.location.origin ? parsed.href : self.location.origin + '/';

            if (clientList.length > 0) {
                let client = clientList[0];
                for (let i = 0; i < clientList.length; i++) {
                    if (clientList[i].focused) {
                        client = clientList[i];
                    }
                }
                return client.focus(); // Alternatively, could navigate to urlToOpen if we check client.url
            }
            return self.clients.openWindow(urlToOpen);
        })
    );
});

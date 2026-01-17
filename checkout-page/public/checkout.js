class PaymentGateway {
    constructor(options) {
        this.key = options.key;
        this.orderId = options.orderId;
        this.onSuccess = options.onSuccess;
        this.onClose = options.onClose;
        this.baseUrl = "http://localhost:3001"; // URL of your React Checkout App
    }

    open() {
        // 1. Create the Modal Container
        this.modal = document.createElement('div');
        Object.assign(this.modal.style, {
            position: 'fixed',
            top: '0',
            left: '0',
            width: '100%',
            height: '100%',
            backgroundColor: 'rgba(0, 0, 0, 0.6)',
            zIndex: '9999',
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center'
        });

        // 2. Create the Iframe
        const iframe = document.createElement('iframe');
        iframe.src = `${this.baseUrl}/checkout?order_id=${this.orderId}`;
        Object.assign(iframe.style, {
            width: '450px',
            height: '650px',
            border: 'none',
            borderRadius: '8px',
            backgroundColor: 'white',
            boxShadow: '0 4px 12px rgba(0,0,0,0.15)'
        });

        // 3. Close Button
        const closeBtn = document.createElement('button');
        closeBtn.innerHTML = '&times;';
        Object.assign(closeBtn.style, {
            position: 'absolute',
            top: '20px',
            right: '30px',
            background: 'none',
            border: 'none',
            color: 'white',
            fontSize: '40px',
            cursor: 'pointer'
        });
        closeBtn.onclick = () => this.close();

        // 4. Assemble
        this.modal.appendChild(closeBtn);
        this.modal.appendChild(iframe);
        document.body.appendChild(this.modal);

        // 5. Listen for Messages from the React App (Success/Failure)
        window.addEventListener('message', this.handleMessage);
    }

    close() {
        if (this.modal) {
            document.body.removeChild(this.modal);
            this.modal = null;
            window.removeEventListener('message', this.handleMessage);
            if (this.onClose) this.onClose();
        }
    }

    handleMessage = (event) => {
        // Security Check: Ensure message comes from our domain
        // In local dev, we skip strict origin check or verify localhost
        if (!event.data) return;

        if (event.data.type === 'payment_success') {
            if (this.onSuccess) this.onSuccess(event.data.data);
            setTimeout(() => this.close(), 2000); // Close automatically after 2s
        }
        
        if (event.data.type === 'payment_failed') {
            console.log("Payment Failed:", event.data.data);
            // We keep the window open so they can retry
        }
    }
}
// stripeAPI.js

const express = require('express');
const bodyParser = require('body-parser');
const Payment = require('./Payment');
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

const router = express.Router();

router.use(bodyParser.json());

router.post('/create-checkout-session', async (req, res) => {
    try {
        // Assuming you want to use paymentMethodId from the request body
        const { paymentMethodId } = req.body;

        // Retrieve product details based on the paymentMethodId or use a predefined list
        const items = [
            {
                price: 'price_1OS65uCoUJLyPm3VAyKXq017', // Your product price ID
                quantity: 1,
            },
            // Add more items if needed
        ];

        // Use paymentMethodId in the session creation if needed
        const session = await stripe.checkout.sessions.create({
            payment_method_types: ['card'],
            line_items: items,
            mode: 'payment',
            success_url: 'http://localhost:8000/success',
            cancel_url: 'http://localhost:8000/cancel',
            // payment_method: paymentMethodId, // Uncomment and use if paymentMethodId is needed
        });

        const payment = new Payment({
            sessionId: session.id,
            // Add more payment-related fields as needed
        });

        // Save the payment record to the database
        await payment.save();
        res.json({ sessionId: session.id });
    } catch (error) {
        console.error('Error creating checkout session:', error);
        res.status(500).json({ error: 'Error creating checkout session' });
    }
});

// Add more routes as needed

module.exports = router;

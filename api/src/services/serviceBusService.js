// Azure Service Bus Service
// Handles background job dispatch for device sync, bulk operations, reports

const { ServiceBusClient } = require('@azure/service-bus');

let sbClient = null;

function getClient() {
    if (sbClient) return sbClient;

    const connectionString = process.env.SERVICEBUS_CONNECTION_STRING;
    if (!connectionString) {
        console.warn('Service Bus not configured — background jobs will run inline');
        return null;
    }

    sbClient = new ServiceBusClient(connectionString);
    return sbClient;
}

async function sendMessage(queueName, body, options = {}) {
    const client = getClient();
    if (!client) {
        // Fallback: execute inline (for local dev)
        console.log(`[ServiceBus:inline] ${queueName}:`, JSON.stringify(body).slice(0, 200));
        return null;
    }

    const sender = client.createSender(queueName);
    try {
        await sender.sendMessages({
            body,
            applicationProperties: {
                source: 'msp-device-manager',
                timestamp: new Date().toISOString(),
                ...options.properties,
            },
            ...(options.scheduledEnqueueTimeUtc && {
                scheduledEnqueueTimeUtc: options.scheduledEnqueueTimeUtc,
            }),
        });
    } finally {
        await sender.close();
    }
}

async function sendBatch(queueName, messages) {
    const client = getClient();
    if (!client) {
        messages.forEach((m) => console.log(`[ServiceBus:inline] ${queueName}:`, JSON.stringify(m).slice(0, 200)));
        return;
    }

    const sender = client.createSender(queueName);
    try {
        const batch = await sender.createMessageBatch();
        for (const msg of messages) {
            if (!batch.tryAddMessage({ body: msg })) {
                await sender.sendMessages(batch);
                const newBatch = await sender.createMessageBatch();
                newBatch.tryAddMessage({ body: msg });
            }
        }
        await sender.sendMessages(batch);
    } finally {
        await sender.close();
    }
}

// Queue names
const QUEUES = {
    DEVICE_SYNC: 'device-sync',
    BULK_OPERATIONS: 'bulk-operations',
    REPORT_GENERATION: 'report-generation',
    ALERTS: 'alerts',
};

module.exports = { sendMessage, sendBatch, QUEUES };

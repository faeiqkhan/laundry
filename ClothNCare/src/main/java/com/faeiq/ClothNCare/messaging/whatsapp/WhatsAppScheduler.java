package com.faeiq.ClothNCare.messaging.whatsapp;

import com.faeiq.ClothNCare.orders.entity.Orders;
import com.faeiq.ClothNCare.orders.entity.Status;
import com.faeiq.ClothNCare.orders.repository.OrdersRepository;
import lombok.RequiredArgsConstructor;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.temporal.ChronoUnit;
import java.util.List;

@Component
@RequiredArgsConstructor
public class WhatsAppScheduler {

    private static final Logger log = LoggerFactory.getLogger(WhatsAppScheduler.class);

    private final OrdersRepository ordersRepository;
    private final WhatsAppNotifier notifier;
    private final WhatsAppMessagingService messagingService;

    @Scheduled(cron = "0 30 9 * * *")
    @Transactional
    public void advanceOrderStatuses() {
        if (!messagingService.isEnabled()) {
            log.info("WhatsApp scheduling skipped: WhatsApp not enabled");
            return;
        }

        List<Orders> activeOrders = ordersRepository.findAll().stream()
                .filter(o -> o.getStatus() != Status.DELIVERED && o.getStatus() != Status.CANCELLED)
                .toList();

        int advanced = 0;
        for (Orders order : activeOrders) {
            Status target = scheduledStage(order);
            if (target.ordinal() > order.getStatus().ordinal()) {
                Status previous = order.getStatus();
                order.setStatus(target);
                ordersRepository.save(order);
                notifier.notifyStatusChanged(order, previous);
                advanced++;
            }
        }
        log.info("WhatsApp scheduler: advanced {} of {} active orders", advanced, activeOrders.size());
    }

    private Status scheduledStage(Orders order) {
        if (order.getCreated_at() == null) {
            return Status.RECEIVED;
        }
        long days = ChronoUnit.DAYS.between(order.getCreated_at().toLocalDate(), LocalDate.now());
        if (days >= 4) {
            return Status.READY;
        }
        if (days == 3) {
            return Status.IRONING;
        }
        if (days == 2) {
            return Status.DRYING;
        }
        if (days == 1) {
            return Status.WASHING;
        }
        return Status.RECEIVED;
    }
}
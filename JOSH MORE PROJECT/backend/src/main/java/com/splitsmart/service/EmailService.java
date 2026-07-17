package com.splitsmart.service;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.mail.MailException;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
@Slf4j
public class EmailService {

    private final JavaMailSender javaMailSender;

    @Value("${spring.mail.host:mock}")
    private String mailHost;

    public void sendInvitationEmail(String toEmail, String groupName, String inviterName) {
        String subject = "You've been invited to join " + groupName + " on SplitSmart!";
        String text = String.format(
            "Hello!\n\n" +
            "%s has invited you to join the group '%s' on SplitSmart to easily track and split expenses.\n\n" +
            "To get started, simply log in to your account. Your new group is waiting for you!\n\n" +
            "Welcome to SplitSmart!\n\n" +
            "Best,\nThe SplitSmart Team",
            inviterName, groupName
        );

        if ("mock".equalsIgnoreCase(mailHost)) {
            // Mock mode: just log beautifully to the console
            log.info("\n\n======================================================\n" +
                     "📧 MOCK EMAIL INTERCEPTED (Development Mode)\n" +
                     "======================================================\n" +
                     "To: {}\nSubject: {}\n\n{}\n" +
                     "======================================================\n",
                     toEmail, subject, text);
            return;
        }

        try {
            SimpleMailMessage message = new SimpleMailMessage();
            message.setFrom("noreply@splitsmart.com");
            message.setTo(toEmail);
            message.setSubject(subject);
            message.setText(text);
            
            javaMailSender.send(message);
            log.info("Invitation email sent successfully to {}", toEmail);
        } catch (MailException e) {
            log.error("Failed to send invitation email to {}", toEmail, e);
        }
    }
}

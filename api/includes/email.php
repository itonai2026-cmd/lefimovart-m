<?php
/**
 * Email Sending with PHPMailer
 */

require_once __DIR__ . '/../config.php';

function send_verification_email(string $to, string $code): void {
    $subject = APP_NAME . ' – Verification Code';
    $body = "Your verification code is: <strong>{$code}</strong><br><br>Enter this code on the verification page.";
    send_mail($to, $subject, $body);
}

function send_reset_email(string $to, string $link): void {
    $subject = APP_NAME . ' – Password Reset';
    $body = "Click the link below to reset your password (valid for 15 minutes):<br><br>";
    $body .= "<a href=\"{$link}\" style=\"color: #6366f1; font-weight: bold;\">{$link}</a>";
    send_mail($to, $subject, $body);
}

function send_mail(string $to, string $subject, string $htmlBody): void {
    if (empty(SMTP_USER) || empty(SMTP_PASS)) {
        error_log("SMTP not configured – would send to {$to}: {$subject}");
        return;
    }
    
    // Try to load PHPMailer if available
    if (file_exists(__DIR__ . '/PHPMailer/PHPMailer.php')) {
        try {
            require_once __DIR__ . '/PHPMailer/Exception.php';
            require_once __DIR__ . '/PHPMailer/PHPMailer.php';
            require_once __DIR__ . '/PHPMailer/SMTP.php';
            
            $mail = new PHPMailer\PHPMailer\PHPMailer(true);
            $mail->isSMTP();
            $mail->Host = SMTP_HOST;
            $mail->SMTPAuth = true;
            $mail->Username = SMTP_USER;
            $mail->Password = SMTP_PASS;
            $port = (int) SMTP_PORT;
            if ($port === 465) {
                $mail->SMTPSecure = PHPMailer\PHPMailer\PHPMailer::ENCRYPTION_SMTPS;
            } else {
                $mail->SMTPSecure = PHPMailer\PHPMailer\PHPMailer::ENCRYPTION_STARTTLS;
            }
            $mail->Port = $port;
            $mail->CharSet = 'UTF-8';
            
            $mail->setFrom(SMTP_FROM, SMTP_FROM_NAME);
            $mail->addAddress($to);
            
            $mail->isHTML(true);
            $mail->Subject = $subject;
            $mail->Body = $htmlBody;
            
            $mail->send();
            error_log("Email sent successfully to {$to}");
        } catch (Exception $e) {
            error_log("PHPMailer Error: " . $e->getMessage());
        }
        return;
    }
    
    // Fallback: use native PHP mail()
    $headers = "MIME-Version: 1.0\r\n";
    $headers .= "Content-type: text/html; charset=UTF-8\r\n";
    $headers .= "From: " . SMTP_FROM_NAME . " <" . SMTP_FROM . ">\r\n";
    $headers .= "Reply-To: " . SMTP_FROM . "\r\n";
    
    if (@mail($to, $subject, $htmlBody, $headers)) {
        error_log("Email sent successfully to {$to} via native mail()");
    } else {
        error_log("Failed to send email to {$to}");
    }
}

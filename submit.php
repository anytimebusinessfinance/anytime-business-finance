<?php
if ($_SERVER['REQUEST_METHOD'] !== 'POST') { http_response_code(405); exit('Method not allowed'); }
if (!empty($_POST['website'] ?? '')) { header('Location: thank-you.html'); exit; }
function clean($v) { return trim(strip_tags((string)$v)); }
$name=clean($_POST['Full_Name'] ?? $_POST['Full Name'] ?? '');
$business=clean($_POST['Business_Name'] ?? $_POST['Business Name'] ?? '');
$email=filter_var(trim($_POST['Email'] ?? ''), FILTER_VALIDATE_EMAIL);
$phone=clean($_POST['Telephone'] ?? '');
$requirement=clean($_POST['Requirement'] ?? '');
$amount=clean($_POST['Amount'] ?? '');
$timing=clean($_POST['Timing'] ?? '');
$preference=clean($_POST['Contact_Preference'] ?? $_POST['Contact Preference'] ?? '');
$details=clean($_POST['Details'] ?? '');
if (!$name || !$business || !$email || !$phone || !$requirement || !$amount || !$details) { http_response_code(400); exit('Please complete all required fields.'); }
$to='sam@anytimebusinessfinance.co.uk';
$subject='NEW WEBSITE ENQUIRY — '.$amount.' — '.$requirement;
$body="New Anytime Business Finance website enquiry\n\nName: $name\nBusiness: $business\nEmail: $email\nTelephone: $phone\nRequirement: $requirement\nAmount: $amount\nTiming: $timing\nPreferred contact: $preference\n\nDetails:\n$details\n";
$headers="From: Anytime Business Finance Website <website@anytimebusinessfinance.co.uk>\r\nReply-To: $email\r\nContent-Type: text/plain; charset=UTF-8\r\n";
if (@mail($to, $subject, $body, $headers)) { header('Location: thank-you.html'); exit; }
http_response_code(500); echo 'We could not send your enquiry automatically. Please email sam@anytimebusinessfinance.co.uk.';
?>

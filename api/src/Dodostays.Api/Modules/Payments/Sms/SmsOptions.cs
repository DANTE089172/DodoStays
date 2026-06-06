namespace Dodostays.Api.Modules.Payments.Sms;

public class SmsOptions
{
    public const string SectionName = "Sms";
    public string Provider { get; set; } = "Log"; // "Log" | "Twilio"
    public string TwilioAccountSid { get; set; } = "";
    public string TwilioAuthToken { get; set; } = "";
    public string TwilioFromNumber { get; set; } = "";  // e.g., "+15551234567"
    public string OutputDir { get; set; } = "wwwroot/sms";
}

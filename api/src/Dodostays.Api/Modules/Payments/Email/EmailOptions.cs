namespace Dodostays.Api.Modules.Payments.Email;

public class EmailOptions
{
    public const string SectionName = "Email";
    public string Provider { get; set; } = "Log"; // "Log" | "Resend"
    public string ResendApiKey { get; set; } = "";
    public string FromAddress { get; set; } = "noreply@dodostays.com";
    public string OutputDir { get; set; } = "wwwroot/emails";
}

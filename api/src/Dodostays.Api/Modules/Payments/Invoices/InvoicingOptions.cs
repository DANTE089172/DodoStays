namespace Dodostays.Api.Modules.Payments.Invoices;

public class InvoicingOptions
{
    public const string SectionName = "Invoicing";
    public string GuestSequencePrefix { get; set; } = "DS";
    public string CommissionSequencePrefix { get; set; } = "DS-COM";
    public string CreditNoteSequencePrefix { get; set; } = "DS-CN";
}

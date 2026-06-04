using System.Globalization;

namespace Dodostays.Api.Contracts.Search;

public sealed record Anchor(double Lat, double Lng, string Name)
{
    public const int MaxAnchors = 3;

    public static bool TryParseList(string? value, out IReadOnlyList<Anchor> anchors)
    {
        anchors = Array.Empty<Anchor>();
        if (string.IsNullOrWhiteSpace(value)) return true;

        var parsed = new List<Anchor>();
        foreach (var token in value.Split('|', StringSplitOptions.RemoveEmptyEntries))
        {
            var parts = token.Split(',', 3, StringSplitOptions.TrimEntries);
            if (parts.Length < 2) continue;
            if (!double.TryParse(parts[0], NumberStyles.Float, CultureInfo.InvariantCulture, out var lat)) continue;
            if (!double.TryParse(parts[1], NumberStyles.Float, CultureInfo.InvariantCulture, out var lng)) continue;
            var name = parts.Length == 3 ? parts[2] : $"Anchor {parsed.Count + 1}";
            parsed.Add(new Anchor(lat, lng, name));
            if (parsed.Count >= MaxAnchors) break;
        }
        anchors = parsed;
        return true;
    }
}

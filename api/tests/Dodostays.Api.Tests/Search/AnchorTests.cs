using Xunit;
using FluentAssertions;
using Dodostays.Api.Contracts.Search;

namespace Dodostays.Api.Tests.Search;

public class AnchorTests
{
    [Fact]
    public void TryParseList_returns_anchors_for_valid_input()
    {
        var ok = Anchor.TryParseList("-20.45,57.32,Le Morne|-20.43,57.68,Airport", out var anchors);
        ok.Should().BeTrue();
        anchors.Should().HaveCount(2);
        anchors[0].Lat.Should().Be(-20.45);
        anchors[0].Lng.Should().Be(57.32);
        anchors[0].Name.Should().Be("Le Morne");
        anchors[1].Name.Should().Be("Airport");
    }

    [Fact]
    public void TryParseList_caps_at_three_anchors()
    {
        var raw = "-20,57,A|-20,57,B|-20,57,C|-20,57,D";
        var ok = Anchor.TryParseList(raw, out var anchors);
        ok.Should().BeTrue();
        anchors.Should().HaveCount(3);
    }

    [Theory]
    [InlineData("not-an-anchor")]
    [InlineData("a,b,c")]
    [InlineData("")]
    public void TryParseList_returns_empty_for_garbage(string input)
    {
        Anchor.TryParseList(input, out var anchors).Should().BeTrue();
        anchors.Should().BeEmpty();
    }

    [Fact]
    public void TryParseList_treats_null_as_empty()
    {
        Anchor.TryParseList(null, out var anchors).Should().BeTrue();
        anchors.Should().BeEmpty();
    }
}

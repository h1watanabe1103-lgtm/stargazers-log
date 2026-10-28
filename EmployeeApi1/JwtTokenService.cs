using System.Security.Claims;
using System.Text;
using Microsoft.IdentityModel.JsonWebTokens;
using Microsoft.IdentityModel.Tokens;

// ログイン成功時に渡す、アクセストークン（JWT）を作るクラス
public class JwtTokenService(IConfiguration config)
{
    public (string Token, DateTime ExpiresAt) Create(User user)
    {
        var jwt = config.GetSection("Jwt");
        var key = jwt["Key"] ?? throw new InvalidOperationException("Jwt:Key が設定されていません。");
        var minutes = int.TryParse(jwt["ExpireMinutes"], out var m) ? m : 60;
        var expires = DateTime.UtcNow.AddMinutes(minutes);

        var descriptor = new SecurityTokenDescriptor
        {
            // トークンに入れる情報：ユーザーID、ユーザー名、権限
            Subject = new ClaimsIdentity(new[]
            {
                new Claim("sub", user.Id.ToString()),
                new Claim("name", user.UserName),
                new Claim("role", user.Role)
            }),
            Issuer = jwt["Issuer"],
            Audience = jwt["Audience"],
            Expires = expires,
            SigningCredentials = new SigningCredentials(
                new SymmetricSecurityKey(Encoding.UTF8.GetBytes(key)),
                SecurityAlgorithms.HmacSha256)
        };

        return (new JsonWebTokenHandler().CreateToken(descriptor), expires);
    }
}

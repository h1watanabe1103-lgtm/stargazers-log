# ===== 1. ビルド用の部屋（重い）：.NET SDKでpublishする =====
FROM mcr.microsoft.com/dotnet/sdk:10.0 AS build
WORKDIR /src

# 先にcsprojだけコピーしてrestore（パッケージ取得をキャッシュさせるため）
COPY *.csproj ./
RUN dotnet restore

COPY . .
# 変更前
## RUN dotnet publish -c Release -o /app/publish --no-restore

# 変更後
RUN dotnet publish EmployeeApi.csproj -c Release -o /app/publish --no-restore

# ===== 2. 実行用の部屋（軽い）：publish結果だけ持ち込む =====
FROM mcr.microsoft.com/dotnet/aspnet:10.0
WORKDIR /app
COPY --from=build /app/publish .

ENV ASPNETCORE_URLS=http://+:8080
EXPOSE 8080

# ★ EmployeeApi.dll は csproj のファイル名に合わせて変更する
ENTRYPOINT ["dotnet", "EmployeeApi.dll"]

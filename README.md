# 塔吉多自动签到

塔吉多自动签到工具。第一次用 GitHub 也可以按下面 6 步完成：Fork、开 Actions、加 Secret、登录、测试签到。

支持：GitHub Actions、Cloudflare Workers、Docker、本地 CLI；默认尝试签到全部已知游戏 `1256`、`1257`、`1289`。

## 快速开始

### 1. Fork 这个仓库

点页面右上角 **Fork**，把仓库复制到自己的 GitHub 账号下。

### 2. 打开 Actions

进入你 Fork 后的仓库，点上方 **Actions**。如果 GitHub 提示启用 workflow，点确认启用。

### 3. 创建 GitHub PAT

这个 token 用来让 workflow 自动更新账号 Secret。

1. 打开 GitHub 右上角头像 -> **Settings**
2. 进入 **Developer settings** -> **Personal access tokens**
3. 创建一个 fine-grained token
4. Repository access 选择你 Fork 的仓库
5. Repository permissions 里把 **Secrets** 设为 **Read and write**
6. 复制生成的 token

### 4. 添加必要 Secret

进入你 Fork 后仓库的：

```text
Settings -> Secrets and variables -> Actions -> New repository secret
```

先添加：

```text
GH_SECRET_UPDATE_TOKEN=上一步复制的 PAT
```

如果准备使用账号密码登录，再添加：

```text
TAYGEDO_LOGIN_PASSWORD=你的塔吉多登录密码
```

### 5. 添加账号

进入 **Actions** -> **塔吉多登录** -> **Run workflow**。

推荐使用密码模式：

```text
mode=password
phone=你的手机号
account_id=main
account_name=主账号
```

其中 `mode`、`account_id`、`account_name` 已经有默认值，第一次只要填手机号即可。

`password` 输入框可以留空，workflow 会读取 `TAYGEDO_LOGIN_PASSWORD` Secret。

运行成功后，会自动创建或更新 `TAYGEDO_ACCOUNTS` Secret。

如果失败提示 `Missing required env TAYGEDO_LOGIN_PASSWORD`，说明还没有添加 `TAYGEDO_LOGIN_PASSWORD` Secret，或者直接在本次 Run workflow 的 `password` 输入框里填了密码。

### 6. 测试签到

进入 **Actions** -> **塔吉多签到** -> **Run workflow**。

看到日志里出现类似下面内容，就说明部署好了：

```text
塔吉多每日签到结果
总账号：1，成功：1，失败：0
```

之后 workflow 会按计划每天自动运行。

## 短信验证码登录

如果不想保存密码，可以用短信模式。

第一次运行 **塔吉多登录**：

```text
mode=send-code
phone=你的手机号
```

workflow 会自动保存 `TAYGEDO_LOGIN_DEVICE_ID` Secret。

收到验证码后再运行：

```text
mode=login
phone=你的手机号
captcha=短信验证码
account_id=main
account_name=主账号
```

## 多账号

重复运行登录 workflow，换一个 `account_id` 即可：

```text
account_id=alt
account_name=小号
```

已有 `account_id` 会被覆盖；新的 `account_id` 会追加。

## 常用 Secret

| 名称 | 说明 |
| --- | --- |
| `GH_SECRET_UPDATE_TOKEN` | 必填，用于写回 `TAYGEDO_ACCOUNTS` |
| `TAYGEDO_ACCOUNTS` | 登录 workflow 自动生成，通常不用手写 |
| `TAYGEDO_LOGIN_PASSWORD` | 密码登录推荐使用的密码 Secret |
| `TAYGEDO_PASSWORDS` | 多账号自动重登用密码映射，例如 `{"main":"密码"}` |
| `TAYGEDO_LOGIN_DEVICE_ID` | 短信登录自动生成 |
| `TAYGEDO_NOTIFICATION_URLS` | 普通 webhook，多个用英文逗号分隔 |
| `TAYGEDO_SERVERCHAN_SENDKEY` | Server 酱 SendKey |
| `TAYGEDO_MAX_RETRIES` | 单账号最大重试次数，默认 `3` |

## 账号 JSON

`TAYGEDO_ACCOUNTS` 是账号数组，示例：

```json
[
  {
    "id": "main",
    "name": "主账号",
    "uid": "123456",
    "deviceId": "abcdef1234567890",
    "accessToken": "your-access-token",
    "refreshToken": "your-refresh-token",
    "laohuToken": "your-laohu-token",
    "laohuUserId": "your-laohu-user-id",
    "tokenUpdatedAt": "2026-05-07T00:00:00.000Z",
    "phone": "13800138000"
  }
]
```

账号 JSON 不保存明文密码。需要自动账密重登时，把密码放在运行环境里：

```text
TAYGEDO_PASSWORDS={"main":"你的塔吉多密码"}
```

`accessToken` 失效且账号有 `phone`，并且运行环境能按 `account_id` 或手机号找到密码时，会优先账密重登；失败后再尝试 `refreshToken` 和老虎登录凭证。

## Cloudflare Workers

[![Deploy to Cloudflare](https://deploy.workers.cloudflare.com/button)](https://deploy.workers.cloudflare.com/?url=https://github.com/zzstar101/taygedo-auto-attendance)

部署后配置：

```text
TAYGEDO_ACCOUNTS=[账号 JSON]
TAYGEDO_ADMIN_TOKEN=手动触发用的随机字符串
```

可选：

```text
TAYGEDO_NOTIFICATION_URLS=webhook 地址
TAYGEDO_SERVERCHAN_SENDKEY=Server 酱 SendKey
```

Worker 使用绑定名为 `KV` 的 Cloudflare KV。首次运行会从 `TAYGEDO_ACCOUNTS` 初始化 KV，之后账号更新写回 KV。

通过密码登录并写入 KV：

```bash
curl -X POST \
  -H "Authorization: Bearer <TAYGEDO_ADMIN_TOKEN>" \
  -H "Content-Type: application/json" \
  -d '{"mode":"password","phone":"13800138000","password":"你的塔吉多密码","accountId":"main","accountName":"主账号"}' \
  https://你的-worker.workers.dev/login
```

手动触发：

```bash
curl -H "Authorization: Bearer <TAYGEDO_ADMIN_TOKEN>" https://你的-worker.workers.dev/run
```

## Docker

生成账号文件：

```bash
mkdir -p data
docker compose run --rm taygedo-attendance \
  -e TAYGEDO_LOGIN_PASSWORD=your-password \
  pnpm local login \
  --mode password \
  --phone 13800138000 \
  --account-id main \
  --account-name 主账号 \
  --accounts-file /data/accounts.json
```

使用 compose 运行一次签到：

```bash
docker compose run --rm taygedo-attendance
```

使用本地构建镜像：

```bash
docker compose build
docker compose run --rm taygedo-attendance
```

镜像 workflow 会推送 `linux/amd64` 和 `linux/arm64`。

## 本地 CLI

```bash
pnpm install
pnpm local attendance --accounts-file data/accounts.json --state-dir data/state
```

本地账密登录：

```bash
TAYGEDO_LOGIN_PASSWORD=your-password pnpm local login --mode password --phone 13800138000 --account-id main --account-name 主账号 --accounts-file data/accounts.json
```

## 安全提示

本项目不会把登录密码写入 `accounts.json`、Cloudflare KV 或 GitHub Secret 里的账号 JSON。需要自动重登时，请把密码放在 GitHub Secret、Cloudflare Secret、Docker `.env` 或本地环境变量里，不要写进 README、issue、日志或公开文件。

## 致谢

- [AEtherside/skland-daily-attendance](https://github.com/AEtherside/skland-daily-attendance)：多平台部署、Cloudflare Worker、Docker、存储抽象等方向参考。
- [SkyBlue997/tjd-daily](https://github.com/SkyBlue997/tjd-daily)：塔吉多登录、账密重登、任务流程和协议细节参考。

## 开源协议

本项目采用 MIT License，见 [LICENSE](LICENSE)。

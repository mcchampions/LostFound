package me.qscbm.projects.lostfound.service.impl;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

/**
 * 邮件正文构建：基于前端站点地址生成带「快速跳转链接」的 HTML / 纯文本内容。
 */
@Component
public class EmailContentBuilder {

    private final String siteBaseUrl;

    public EmailContentBuilder(
            @Value("${app.site.base-url:http://localhost:5173}") String siteBaseUrl) {
        this.siteBaseUrl = siteBaseUrl == null || siteBaseUrl.isBlank()
                ? "http://localhost:5173"
                : (siteBaseUrl.endsWith("/")
                ? siteBaseUrl.substring(0, siteBaseUrl.length() - 1)
                : siteBaseUrl);
    }

    public String url(String path) {
        String p = path == null || path.isBlank() ? "/" : path;
        return siteBaseUrl + (p.startsWith("/") ? p : "/" + p);
    }

    public String plainBody(String summary, String actionText, String actionUrl) {
        StringBuilder sb = new StringBuilder(summary == null ? "" : summary);
        if (hasAction(actionText, actionUrl)) {
            sb.append("\n\n").append(actionText).append("：").append(url(actionUrl));
        }
        sb.append("\n\n管理邮件提醒偏好：" + url("/profile"));
        sb.append("\n\n—— 校园失物招领系统");
        return sb.toString();
    }

    public String htmlBody(String summary, String actionText, String actionUrl) {
        String actionLink = "";
        if (hasAction(actionText, actionUrl)) {
            String href = escapeHtml(url(actionUrl));
            String label = escapeHtml(actionText);
            actionLink = "<p><a href=\"" + href + "\" style=\"display:inline-block;padding:10px 20px;"
                    + "background:#1976d2;color:#ffffff;text-decoration:none;border-radius:6px;\">"
                    + label + "</a></p>"
                    + "<p style=\"color:#888888;font-size:12px;\">如果按钮无法点击，请复制链接："
                    + href + "</p>";
        }
        return "<div style=\"font-family:-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;"
                + "max-width:560px;margin:0 auto;padding:24px;\">"
                + "<h2 style=\"color:#1976d2;margin:0 0 12px;\">校园失物招领</h2>"
                + "<p style=\"font-size:15px;line-height:1.7;color:#333333;\">"
                + escapeHtml(summary) + "</p>"
                + actionLink
                + "<hr style=\"border:none;border-top:1px solid #eeeeee;margin:20px 0;\"/>"
                + "<p style=\"font-size:12px;\"><a href=\"" + escapeHtml(url("/profile"))
                + "\" style=\"color:#888888;\">管理邮件提醒偏好</a></p>"
                + "<p style=\"color:#999999;font-size:12px;\">本邮件由校园失物招领系统自动发送，请勿直接回复。</p>"
                + "</div>";
    }

    private boolean hasAction(String actionText, String actionUrl) {
        return actionText != null && !actionText.isBlank()
                && actionUrl != null && !actionUrl.isBlank();
    }

    static String escapeHtml(String value) {
        if (value == null) {
            return "";
        }
        return value.replace("&", "&amp;")
                .replace("<", "&lt;")
                .replace(">", "&gt;")
                .replace("\"", "&quot;")
                .replace("'", "&#39;");
    }
}

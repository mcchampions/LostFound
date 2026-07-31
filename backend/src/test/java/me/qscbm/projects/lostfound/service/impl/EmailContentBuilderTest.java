package me.qscbm.projects.lostfound.service.impl;

import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;

class EmailContentBuilderTest {

    private final EmailContentBuilder builder = new EmailContentBuilder("http://localhost:5173/");

    @Test
    void buildsUrlWithoutDuplicateSlash() {
        assertThat(builder.url("/chat")).isEqualTo("http://localhost:5173/chat");
        assertThat(builder.url("claims")).isEqualTo("http://localhost:5173/claims");
    }

    @Test
    void plainBodyContainsActionLink() {
        String body = builder.plainBody("您有 3 条未读消息", "查看未读消息", "/chat");
        assertThat(body).contains("您有 3 条未读消息");
        assertThat(body).contains("查看未读消息：http://localhost:5173/chat");
    }

    @Test
    void htmlBodyEscapesUserContent() {
        String html = builder.htmlBody("物品 <script>alert(1)</script>", "查看", "/claims");
        assertThat(html).doesNotContain("<script>");
        assertThat(html).contains("&lt;script&gt;");
        assertThat(html).contains("href=\"http://localhost:5173/claims\"");
    }

    @Test
    void htmlBodyOmitsButtonWithoutAction() {
        String html = builder.htmlBody("系统消息", null, null);
        assertThat(html).doesNotContain("查看");
    }
}

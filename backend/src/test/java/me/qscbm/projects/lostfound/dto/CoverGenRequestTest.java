package me.qscbm.projects.lostfound.dto;

import jakarta.validation.Validation;
import jakarta.validation.Validator;
import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;

class CoverGenRequestTest {

    private final Validator validator = Validation.buildDefaultValidatorFactory().getValidator();

    @Test
    void acceptsContentAtEightHundredCharacters() {
        CoverGenRequest request = requestWithContent("正".repeat(800));

        assertThat(validator.validate(request)).isEmpty();
    }

    @Test
    void rejectsContentBeyondEightHundredCharacters() {
        CoverGenRequest request = requestWithContent("正".repeat(801));

        assertThat(validator.validate(request))
                .anyMatch(violation -> "content".equals(violation.getPropertyPath().toString()));
    }

    private CoverGenRequest requestWithContent(String content) {
        CoverGenRequest request = new CoverGenRequest();
        request.setTitle("标题");
        request.setContent(content);
        return request;
    }
}

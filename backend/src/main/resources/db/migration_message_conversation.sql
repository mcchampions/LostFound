-- Merge legacy claim threads into the stable direct conversation for both users.
UPDATE `message`
SET `conversation_id` = CONCAT(
    LEAST(`sender_id`, `receiver_id`),
    '_',
    GREATEST(`sender_id`, `receiver_id`)
)
WHERE LEFT(`conversation_id`, 6) = 'claim_';

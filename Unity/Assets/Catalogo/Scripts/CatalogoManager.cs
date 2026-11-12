using System.Collections;
using UnityEngine;

public class CatalogoManager : MonoBehaviour
{
    [Header("Pages")]
    [SerializeField] private Transform[] pages;

    [Header("Animation")]
    [SerializeField] private float duration = 0.7f;
    [SerializeField] private float rotationAngle = 180f;
    [SerializeField] private AnimationCurve curve = AnimationCurve.EaseInOut(0, 0, 1, 1);

    private int currentPage = 0;
    private bool isAnimating = false;

    public void NextPage()
    {
        if (isAnimating || currentPage >= pages.Length)
            return;

        StartCoroutine(TurnPage(currentPage, true));
    }

    public void PreviousPage()
    {
        if (isAnimating || currentPage <= 0)
            return;

        StartCoroutine(TurnPage(currentPage - 1, false));
    }

    //TODO: Cuando se termine de girar, la pagina se tiene que bajar un poco de altura
    // Asi las siguientes hojas quedan arriba, izquierda bajar, derecha subir en altura

    private IEnumerator TurnPage(int index, bool forward)
    {
        isAnimating = true;

        Transform page = pages[index];

        Quaternion startRotation = page.localRotation;

        Quaternion endRotation = startRotation *
            Quaternion.Euler(
                0,
                0,
                forward ? rotationAngle : -rotationAngle
            );

        float elapsed = 0f;

        while (elapsed < duration)
        {
            elapsed += Time.deltaTime;

            float t = Mathf.Clamp01(elapsed / duration);
            float curvedT = curve.Evaluate(t);

            page.localRotation = Quaternion.Slerp(
                startRotation,
                endRotation,
                curvedT
            );

            yield return null;
        }

        page.localRotation = endRotation;

        currentPage += forward ? 1 : -1;

        isAnimating = false;
    }
}
